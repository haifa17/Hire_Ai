import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InterviewStatus, Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MailService } from '../common/mail/mail.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { QueryRecruiterAvailabilityDto } from './dto/query-recruiter-availability.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';

type InterviewWithRelations = Prisma.InterviewGetPayload<{
  include: {
    recruiter: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
    candidate: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
        phone: true;
        address: true;
      };
    };
    jobOffer: {
      select: {
        id: true;
        title: true;
        city: true;
        country: true;
      };
    };
  };
}>;

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private readonly detailsInclude = {
    recruiter: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
    candidate: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
      },
    },
    jobOffer: {
      select: {
        id: true,
        title: true,
        city: true,
        country: true,
      },
    },
  } as const;

  async create(user: User, dto: CreateInterviewDto) {
    if (user.role !== Role.RECRUITER && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only recruiters can schedule interviews.');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    this.ensureFutureDate(scheduledAt);

    const [candidate, jobOffer] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: dto.candidateId, role: Role.CANDIDATE },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      }),
      this.prisma.jobOffer.findUnique({
        where: { id: dto.jobOfferId },
        select: {
          id: true,
          recruiterId: true,
          title: true,
          city: true,
          country: true,
        },
      }),
    ]);

    if (!candidate) {
      throw new NotFoundException('Candidate not found.');
    }

    if (!jobOffer) {
      throw new NotFoundException('Job offer not found.');
    }

    if (user.role !== Role.ADMIN && jobOffer.recruiterId !== user.id) {
      throw new ForbiddenException(
        'You can only schedule interviews for your own job offers.',
      );
    }

    const application = await this.prisma.application.findUnique({
      where: {
        candidateId_jobOfferId: {
          candidateId: dto.candidateId,
          jobOfferId: dto.jobOfferId,
        },
      },
      select: { id: true },
    });

    if (!application) {
      throw new BadRequestException(
        'Candidate must have applied to the selected job offer first.',
      );
    }

    await this.assertNoConflict(
      jobOffer.recruiterId,
      scheduledAt,
      dto.duration,
    );

    const interview = await this.prisma.interview.create({
      data: {
        title: dto.title.trim(),
        interviewType: dto.interviewType,
        status: InterviewStatus.SCHEDULED,
        scheduledAt,
        duration: dto.duration,
        message: dto.message?.trim() || null,
        sendInvitation: dto.sendInvitation ?? true,
        notes: dto.notes?.trim() || null,
        recruiterId: jobOffer.recruiterId,
        candidateId: dto.candidateId,
        jobOfferId: dto.jobOfferId,
      },
      include: this.detailsInclude,
    });

    if (interview.sendInvitation) {
      await this.mailService.sendInterviewInvitation({
        candidateEmail: candidate.email,
        candidateName: `${candidate.firstName} ${candidate.lastName}`.trim(),
        recruiterName:
          `${interview.recruiter.firstName} ${interview.recruiter.lastName}`.trim(),
        title: interview.title,
        interviewType: interview.interviewType,
        scheduledAt: interview.scheduledAt,
        duration: interview.duration,
        message: interview.message ?? undefined,
        jobTitle: jobOffer.title,
        location: `${jobOffer.city}, ${jobOffer.country}`,
      });
    }

    return interview;
  }

  async findOne(user: User, id: string) {
    const interview = await this.prisma.interview.findUnique({
      where: { id },
      include: this.detailsInclude,
    });

    if (!interview) {
      throw new NotFoundException('Interview not found.');
    }

    this.assertCanAccessInterview(user, interview);
    return interview;
  }

  async findMine(user: User) {
    let where: Prisma.InterviewWhereInput = {};

    if (user.role === Role.RECRUITER) {
      where = { recruiterId: user.id };
    } else if (user.role === Role.CANDIDATE) {
      where = { candidateId: user.id };
    }

    return this.prisma.interview.findMany({
      where,
      include: this.detailsInclude,
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async update(user: User, id: string, dto: UpdateInterviewDto) {
    const current = await this.prisma.interview.findUnique({
      where: { id },
      include: this.detailsInclude,
    });

    if (!current) {
      throw new NotFoundException('Interview not found.');
    }

    this.assertCanMutateInterview(user, current);

    const nextScheduledAt = dto.scheduledAt
      ? new Date(dto.scheduledAt)
      : current.scheduledAt;
    const nextDuration = dto.duration ?? current.duration;
    const isRescheduling =
      dto.scheduledAt !== undefined || dto.duration !== undefined;

    if (isRescheduling) {
      this.ensureFutureDate(nextScheduledAt);
      await this.assertNoConflict(
        current.recruiterId,
        nextScheduledAt,
        nextDuration,
        current.id,
      );
    }

    let nextStatus = dto.status;
    if (isRescheduling && !dto.status) {
      nextStatus = InterviewStatus.RESCHEDULED;
    }

    if (
      nextStatus === InterviewStatus.CANCELLED &&
      !dto.notes &&
      !current.notes
    ) {
      throw new BadRequestException(
        'Please provide cancellation notes for traceability.',
      );
    }

    return this.prisma.interview.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        interviewType: dto.interviewType,
        status: nextStatus,
        scheduledAt: dto.scheduledAt ? nextScheduledAt : undefined,
        duration: dto.duration,
        message: dto.message?.trim(),
        sendInvitation: dto.sendInvitation,
        notes: dto.notes?.trim(),
      },
      include: this.detailsInclude,
    });
  }

  async remove(user: User, id: string) {
    const current = await this.prisma.interview.findUnique({
      where: { id },
      include: this.detailsInclude,
    });

    if (!current) {
      throw new NotFoundException('Interview not found.');
    }

    this.assertCanMutateInterview(user, current);

    await this.prisma.interview.delete({ where: { id } });
    return { message: 'Interview deleted successfully.' };
  }

  async getRecruiterAvailability(
    requester: User,
    recruiterId: string,
    query: QueryRecruiterAvailabilityDto,
  ) {
    if (
      requester.role !== Role.ADMIN &&
      (requester.role !== Role.RECRUITER || requester.id !== recruiterId)
    ) {
      throw new ForbiddenException(
        'You can only view your own availability slots.',
      );
    }

    const from = query.from ? new Date(query.from) : new Date();
    const to = query.to
      ? new Date(query.to)
      : new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (to <= from) {
      throw new BadRequestException(
        'The end date must be after the start date.',
      );
    }

    const interviews = await this.prisma.interview.findMany({
      where: {
        recruiterId,
        status: {
          in: [InterviewStatus.SCHEDULED, InterviewStatus.RESCHEDULED],
        },
        scheduledAt: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        duration: true,
        status: true,
      },
    });

    const busySlots = interviews.map((interview) => ({
      id: interview.id,
      title: interview.title,
      status: interview.status,
      startsAt: interview.scheduledAt,
      endsAt: new Date(
        interview.scheduledAt.getTime() + interview.duration * 60_000,
      ),
    }));

    return {
      recruiterId,
      from,
      to,
      busySlots,
    };
  }

  private ensureFutureDate(date: Date) {
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('Interview time must be in the future.');
    }
  }

  private async assertNoConflict(
    recruiterId: string,
    startsAt: Date,
    duration: number,
    excludeInterviewId?: string,
  ) {
    const candidateEnd = new Date(startsAt.getTime() + duration * 60_000);

    const where: Prisma.InterviewWhereInput = {
      recruiterId,
      status: {
        in: [InterviewStatus.SCHEDULED, InterviewStatus.RESCHEDULED],
      },
      ...(excludeInterviewId ? { NOT: { id: excludeInterviewId } } : {}),
      scheduledAt: { lt: candidateEnd },
    };

    const interviews = await this.prisma.interview.findMany({
      where,
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
      },
    });

    const overlapping = interviews.some((interview) => {
      const existingEnd = new Date(
        interview.scheduledAt.getTime() + interview.duration * 60_000,
      );

      return interview.scheduledAt < candidateEnd && existingEnd > startsAt;
    });

    if (overlapping) {
      throw new BadRequestException(
        'The selected time conflicts with another interview.',
      );
    }
  }

  private assertCanAccessInterview(
    user: User,
    interview: InterviewWithRelations,
  ) {
    if (user.role === Role.ADMIN) return;

    if (user.role === Role.RECRUITER && user.id === interview.recruiterId) {
      return;
    }

    if (user.role === Role.CANDIDATE && user.id === interview.candidateId) {
      return;
    }

    throw new ForbiddenException('Not authorized to access this interview.');
  }

  private assertCanMutateInterview(
    user: User,
    interview: InterviewWithRelations,
  ) {
    if (user.role === Role.ADMIN) return;

    if (user.role === Role.RECRUITER && user.id === interview.recruiterId) {
      return;
    }

    throw new ForbiddenException('Not authorized to modify this interview.');
  }
}
