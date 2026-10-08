import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { toPublicUploadUrl } from '../../common/upload/multer-upload.util';
import { CreateCandidateProfileDto } from './dto/create-candidate-profile.dto';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';
import { CreateRecruiterProfileDto } from './dto/create-recruiter-profile.dto';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';
import { UpdateRecruiterCompanyDto } from './dto/update-recruiter-company.dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyCandidateProfile(userId: string) {
    const user = await this.requireUser(userId, Role.CANDIDATE);
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }

    return {
      user: this.mapSafeUser(user),
      profile: this.mapCandidateProfile(profile),
    };
  }

  async createCandidateProfile(userId: string, dto: CreateCandidateProfileDto) {
    const user = await this.requireUser(userId, Role.CANDIDATE);

    await this.ensureEmailAvailability(userId, user.email, dto.email);

    const existing = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Candidate profile already exists');
    }

    const { userData } = this.extractCandidateData(dto);
    const candidateCreateData = this.buildCandidateCreateData(userId, dto);

    const created = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }

      return tx.candidateProfile.create({
        data: candidateCreateData,
      });
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return {
      user: this.mapSafeUser(updatedUser ?? user),
      profile: this.mapCandidateProfile(created),
    };
  }

  async updateCandidateProfile(userId: string, dto: UpdateCandidateProfileDto) {
    const user = await this.requireUser(userId, Role.CANDIDATE);

    await this.ensureEmailAvailability(userId, user.email, dto.email);

    const existing = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('Candidate profile not found');
    }

    const { userData, candidateData } = this.extractCandidateData(dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }

      return tx.candidateProfile.update({
        where: { userId },
        data: candidateData,
      });
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return {
      user: this.mapSafeUser(updatedUser ?? user),
      profile: this.mapCandidateProfile(updated),
    };
  }

  async deleteCandidateProfile(userId: string) {
    await this.requireUser(userId, Role.CANDIDATE);

    const existing = await this.prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('Candidate profile not found');
    }

    await this.prisma.candidateProfile.delete({ where: { userId } });

    return { message: 'Candidate profile deleted successfully' };
  }

  async uploadCandidatePhoto(userId: string, filePath: string) {
    await this.requireUser(userId, Role.CANDIDATE);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { photoUrl: toPublicUploadUrl(filePath) },
    });

    return {
      message: 'Candidate profile photo uploaded successfully',
      data: {
        user: this.mapSafeUser(updatedUser),
      },
    };
  }

  async getCandidateProfileByUserId(candidateUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: candidateUserId },
    });

    if (!user) {
      throw new NotFoundException('Candidate user not found');
    }

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: candidateUserId },
    });

    const resumes = await this.prisma.resume.findMany({
      where: { candidateId: candidateUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        language: true,
        atsScore: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      user: this.mapSafeUser(user),
      profile: profile ? this.mapCandidateProfile(profile) : null,
      resumes,
    };
  }

  async getMyRecruiterProfile(userId: string) {
    const user = await this.requireUser(userId, Role.RECRUITER);
    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
      include: { company: true },
    });

    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    return {
      user: this.mapSafeUser(user),
      profile,
    };
  }

  async createRecruiterProfile(userId: string, dto: CreateRecruiterProfileDto) {
    const user = await this.requireUser(userId, Role.RECRUITER);

    await this.ensureEmailAvailability(userId, user.email, dto.email);

    const existing = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Recruiter profile already exists');
    }

    const { userData } = this.extractRecruiterData(dto);

    const created = await this.prisma.$transaction(async (tx) => {
      const companyId = await this.resolveCompanyIdForRecruiterCreate(tx, dto);

      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }

      return tx.recruiterProfile.create({
        data: this.buildRecruiterCreateData(userId, dto, companyId),
        include: { company: true },
      });
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return {
      user: this.mapSafeUser(updatedUser ?? user),
      profile: created,
    };
  }

  async updateRecruiterProfile(userId: string, dto: UpdateRecruiterProfileDto) {
    const user = await this.requireUser(userId, Role.RECRUITER);

    await this.ensureEmailAvailability(userId, user.email, dto.email);

    const existing = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
      include: { company: true },
    });

    if (!existing) {
      throw new NotFoundException('Recruiter profile not found');
    }

    const { userData, recruiterData } = this.extractRecruiterData(dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      let nextCompanyId: string | undefined;

      if (dto.companyId || dto.company) {
        nextCompanyId = await this.resolveCompanyIdForRecruiterUpdate(
          tx,
          existing.companyId,
          dto,
        );
      }

      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }

      const recruiterUpdateData: Prisma.RecruiterProfileUncheckedUpdateInput = {
        ...recruiterData,
        companyId: nextCompanyId,
      };

      return tx.recruiterProfile.update({
        where: { userId },
        data: recruiterUpdateData,
        include: { company: true },
      });
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return {
      user: this.mapSafeUser(updatedUser ?? user),
      profile: updated,
    };
  }

  async updateRecruiterCompany(userId: string, dto: UpdateRecruiterCompanyDto) {
    await this.requireUser(userId, Role.RECRUITER);

    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const companyId = profile.companyId;

      if (dto.companyId && dto.companyId !== profile.companyId) {
        throw new ForbiddenException(
          'Changing company affiliation is restricted. Please contact an administrator.',
        );
      }

      if (dto.company && Object.keys(dto.company).length > 0) {
        await tx.company.update({
          where: { id: companyId },
          data: dto.company,
        });
      }

      return tx.recruiterProfile.update({
        where: { userId },
        data: { companyId },
        include: { company: true },
      });
    });

    return {
      message: 'Recruiter company updated successfully',
      profile: updated,
    };
  }

  async uploadRecruiterCompanyLogo(userId: string, filePath: string) {
    await this.requireUser(userId, Role.RECRUITER);

    const profile = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Recruiter profile not found');
    }

    const updatedCompany = await this.prisma.company.update({
      where: { id: profile.companyId },
      data: { logoUrl: toPublicUploadUrl(filePath) },
    });

    return {
      message: 'Recruiter company logo uploaded successfully',
      data: {
        company: updatedCompany,
      },
    };
  }

  async deleteRecruiterProfile(userId: string) {
    await this.requireUser(userId, Role.RECRUITER);

    const existing = await this.prisma.recruiterProfile.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('Recruiter profile not found');
    }

    await this.prisma.recruiterProfile.delete({ where: { userId } });

    return { message: 'Recruiter profile deleted successfully' };
  }

  private async requireUser(userId: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== role) {
      throw new ForbiddenException(`Only ${role} users can access this route`);
    }

    return user;
  }

  private extractCandidateData(dto: Partial<CreateCandidateProfileDto>) {
    const userData: Prisma.UserUpdateInput = {
      email: dto.email?.toLowerCase().trim(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      photoUrl: dto.photoUrl,
      phone: dto.phone,
      address: dto.address,
    };

    Object.keys(userData).forEach((key) => {
      if (userData[key as keyof Prisma.UserUpdateInput] === undefined) {
        delete userData[key as keyof Prisma.UserUpdateInput];
      }
    });

    const candidateData: Prisma.CandidateProfileUncheckedUpdateInput = {
      professionalSummary: dto.professionalSummary,
      openToWork: dto.openToWork,
      desiredSalary:
        dto.desiredSalary == null
          ? undefined
          : new Prisma.Decimal(dto.desiredSalary),
      desiredPosition: dto.desiredPosition,
      socialLinks: dto.socialLinks as unknown as Prisma.InputJsonValue,
      experiences: dto.experiences as unknown as Prisma.InputJsonValue,
      education: dto.education as unknown as Prisma.InputJsonValue,
      languages: dto.languages as unknown as Prisma.InputJsonValue,
      skills: dto.skills as unknown as Prisma.InputJsonValue,
      projects: dto.projects as unknown as Prisma.InputJsonValue,
      certifications: dto.certifications as unknown as Prisma.InputJsonValue,
    };

    Object.keys(candidateData).forEach((key) => {
      if (
        candidateData[
          key as keyof Prisma.CandidateProfileUncheckedUpdateInput
        ] === undefined
      ) {
        delete candidateData[
          key as keyof Prisma.CandidateProfileUncheckedUpdateInput
        ];
      }
    });

    return {
      userData,
      candidateData,
    };
  }

  private buildCandidateCreateData(
    userId: string,
    dto: CreateCandidateProfileDto,
  ): Prisma.CandidateProfileUncheckedCreateInput {
    return {
      userId,
      professionalSummary: dto.professionalSummary,
      openToWork: dto.openToWork ?? false,
      desiredSalary:
        dto.desiredSalary == null
          ? null
          : new Prisma.Decimal(dto.desiredSalary),
      desiredPosition: dto.desiredPosition,
      socialLinks: dto.socialLinks as unknown as Prisma.InputJsonValue,
      experiences: dto.experiences as unknown as Prisma.InputJsonValue,
      education: dto.education as unknown as Prisma.InputJsonValue,
      languages: dto.languages as unknown as Prisma.InputJsonValue,
      skills: dto.skills as unknown as Prisma.InputJsonValue,
      projects: dto.projects as unknown as Prisma.InputJsonValue,
      certifications: dto.certifications as unknown as Prisma.InputJsonValue,
    };
  }

  private extractRecruiterData(dto: Partial<CreateRecruiterProfileDto>) {
    const userData: Prisma.UserUpdateInput = {
      email: dto.email?.toLowerCase().trim(),
      firstName: dto.firstName,
      lastName: dto.lastName,
      photoUrl: dto.photoUrl,
      phone: dto.phone,
      address: dto.address,
    };

    Object.keys(userData).forEach((key) => {
      if (userData[key as keyof Prisma.UserUpdateInput] === undefined) {
        delete userData[key as keyof Prisma.UserUpdateInput];
      }
    });

    const recruiterData: Prisma.RecruiterProfileUncheckedUpdateInput = {
      position: dto.position,
      department: dto.department,
      companyId: dto.companyId,
    };

    Object.keys(recruiterData).forEach((key) => {
      if (
        recruiterData[
          key as keyof Prisma.RecruiterProfileUncheckedUpdateInput
        ] === undefined
      ) {
        delete recruiterData[
          key as keyof Prisma.RecruiterProfileUncheckedUpdateInput
        ];
      }
    });

    return {
      userData,
      recruiterData,
    };
  }

  private buildRecruiterCreateData(
    userId: string,
    dto: CreateRecruiterProfileDto,
    companyId: string,
  ): Prisma.RecruiterProfileUncheckedCreateInput {
    return {
      userId,
      companyId,
      position: dto.position,
      department: dto.department,
    };
  }

  private async resolveCompanyIdForRecruiterCreate(
    tx: Prisma.TransactionClient,
    dto: CreateRecruiterProfileDto,
  ): Promise<string> {
    if (dto.companyId) {
      const existing = await tx.company.findUnique({
        where: { id: dto.companyId },
      });
      if (!existing) {
        throw new NotFoundException('Company not found');
      }
      return existing.id;
    }

    if (!dto.company) {
      throw new ConflictException(
        'Recruiter profile must include either companyId or company object',
      );
    }

    const createdCompany = await tx.company.create({ data: dto.company });
    return createdCompany.id;
  }

  private async resolveCompanyIdForRecruiterUpdate(
    tx: Prisma.TransactionClient,
    currentCompanyId: string,
    dto: UpdateRecruiterProfileDto,
  ): Promise<string> {
    let nextCompanyId = currentCompanyId;

    if (dto.companyId && dto.companyId !== currentCompanyId) {
      throw new ForbiddenException(
        'Changing company affiliation is restricted. Please contact an administrator.',
      );
    }

    if (dto.companyId) {
      const existing = await tx.company.findUnique({
        where: { id: dto.companyId },
      });
      if (!existing) {
        throw new NotFoundException('Company not found');
      }
      nextCompanyId = existing.id;
    }

    if (dto.company && Object.keys(dto.company).length > 0) {
      await tx.company.update({
        where: { id: nextCompanyId },
        data: dto.company,
      });
    }

    return nextCompanyId;
  }

  private async ensureEmailAvailability(
    userId: string,
    currentEmail: string,
    nextEmail?: string,
  ) {
    if (!nextEmail) return;

    const normalizedCurrent = currentEmail.toLowerCase().trim();
    const normalizedNext = nextEmail.toLowerCase().trim();

    if (normalizedNext === normalizedCurrent) return;

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedNext },
      select: { id: true },
    });

    if (existing && existing.id !== userId) {
      throw new ConflictException('Email is already in use');
    }
  }

  private mapSafeUser(user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    photoUrl: string | null;
    phone: string | null;
    address: string | null;
  }) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      photoUrl: user.photoUrl,
      phone: user.phone,
      address: user.address,
    };
  }

  private mapCandidateProfile(profile: {
    id: string;
    userId: string;
    professionalSummary: string | null;
    openToWork: boolean;
    desiredSalary: Prisma.Decimal | null;
    desiredPosition: string | null;
    socialLinks: Prisma.JsonValue | null;
    experiences: Prisma.JsonValue | null;
    education: Prisma.JsonValue | null;
    languages: Prisma.JsonValue | null;
    skills: Prisma.JsonValue | null;
    projects: Prisma.JsonValue | null;
    certifications: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...profile,
      desiredSalary: profile.desiredSalary
        ? Number(profile.desiredSalary.toString())
        : null,
    };
  }
}
