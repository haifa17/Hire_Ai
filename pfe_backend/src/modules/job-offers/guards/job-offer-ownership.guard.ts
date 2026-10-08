import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class JobOfferOwnershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: User; params: { id?: string } }>();

    const user = request.user;
    const jobOfferId = request.params?.id;

    if (!jobOfferId || !user) {
      return true;
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    if (user.role !== Role.RECRUITER) {
      throw new ForbiddenException('Only recruiters can access this resource.');
    }

    const jobOffer = await this.prisma.jobOffer.findFirst({
      where: { id: jobOfferId, deletedAt: null },
      select: { id: true, recruiterId: true },
    });

    if (!jobOffer) {
      throw new NotFoundException('Job offer not found.');
    }

    if (jobOffer.recruiterId !== user.id) {
      throw new ForbiddenException('You do not own this job offer.');
    }

    return true;
  }
}
