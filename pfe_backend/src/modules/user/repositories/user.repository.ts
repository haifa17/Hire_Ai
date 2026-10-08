import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  CreateUserData,
  ListUsersQueryInput,
  ListUsersResult,
  UpdateUserData,
  UserRepository,
} from '../interfaces/user-repository.interface';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findDetailsById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        candidateProfile: true,
        recruiterProfile: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    });
  }

  async listUsers(query: ListUsersQueryInput): Promise<ListUsersResult> {
    const where = {
      role: query.role,
      isEmailVerified: query.isEmailVerified,
      isActive: query.isActive,
      OR: query.search
        ? [
            {
              firstName: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            {
              lastName: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            },
            { email: { contains: query.search, mode: 'insensitive' as const } },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async update(id: string, data: Partial<UpdateUserData>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
