import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReportStatus, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateJobReportDto } from './dto/create-job-report.dto';
import { QueryJobReportsDto } from './dto/query-job-reports.dto';

@Injectable()
export class JobReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(user: User, dto: CreateJobReportDto) {
    const jobOffer = await this.prisma.jobOffer.findFirst({
      where: { id: dto.jobOfferId, deletedAt: null },
    });

    if (!jobOffer) {
      throw new NotFoundException('Job offer not found.');
    }

    if (jobOffer.recruiterId === user.id) {
      throw new BadRequestException(
        "Vous ne pouvez pas signaler votre propre offre d'emploi.",
      );
    }

    const existingReport = await this.prisma.jobReport.findUnique({
      where: {
        jobOfferId_userId: {
          jobOfferId: dto.jobOfferId,
          userId: user.id,
        },
      },
    });

    if (existingReport) {
      throw new ConflictException(
        "Vous avez déjà signalé cette offre d'emploi.",
      );
    }

    return this.prisma.jobReport.create({
      data: {
        jobOfferId: dto.jobOfferId,
        userId: user.id,
        type: dto.type,
        reason: dto.reason.trim(),
        status: ReportStatus.PENDING,
      },
      include: {
        jobOffer: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async checkUserReport(userId: string, jobOfferId: string) {
    const existing = await this.prisma.jobReport.findUnique({
      where: {
        jobOfferId_userId: {
          jobOfferId,
          userId,
        },
      },
    });

    return { hasReported: !!existing };
  }

  async findAllForAdmin(query: QueryJobReportsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.JobReportWhereInput = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const [items, total] = await Promise.all([
      this.prisma.jobReport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          jobOffer: {
            select: {
              id: true,
              title: true,
              slug: true,
              status: true,
              deletedAt: true,
              company: {
                select: {
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.jobReport.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  async resolveReport(reportId: string) {
    const report = await this.prisma.jobReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found.');
    }

    return this.prisma.jobReport.update({
      where: { id: reportId },
      data: { status: ReportStatus.RESOLVED },
      include: {
        jobOffer: {
          select: { id: true, title: true, slug: true },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async deleteJobFromReport(jobOfferId: string) {
    const jobOffer = await this.prisma.jobOffer.findUnique({
      where: { id: jobOfferId },
    });

    if (!jobOffer) {
      throw new NotFoundException('Job offer not found.');
    }

    // Execute in a transaction: mark all reports for this job as RESOLVED and delete the job
    return this.prisma.$transaction(async (tx) => {
      await tx.jobReport.updateMany({
        where: {
          jobOfferId,
          status: ReportStatus.PENDING,
        },
        data: {
          status: ReportStatus.RESOLVED,
        },
      });

      await tx.jobOffer.update({
        where: { id: jobOfferId },
        data: {
          status: 'CLOSED',
          deletedAt: new Date(),
        },
      });

      return {
        message:
          'Job offer deleted and associated reports marked as resolved successfully.',
        jobOfferId,
      };
    });
  }
}
