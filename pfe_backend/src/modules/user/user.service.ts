import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { toPublicUploadUrl } from '../../common/upload/multer-upload.util';
import { UserRepositoryImpl } from './repositories/user.repository';
import { UpdateUserData } from './interfaces/user-repository.interface';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepositoryImpl) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findByGoogleId(googleId);
  }

  async update(id: string, data: Partial<UpdateUserData>): Promise<User> {
    return this.userRepository.update(id, data);
  }

  async updateSelf(id: string, data: Partial<UpdateUserData>) {
    const current = await this.findById(id);

    const normalizedEmail = data.email?.toLowerCase().trim();
    if (
      normalizedEmail &&
      normalizedEmail !== current.email.toLowerCase().trim()
    ) {
      const existing = await this.userRepository.findByEmail(normalizedEmail);
      if (existing && existing.id !== id) {
        throw new ConflictException('Email is already in use');
      }
    }

    const payload: Partial<UpdateUserData> = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: normalizedEmail,
      phone: data.phone,
      address: data.address,
      photoUrl: data.photoUrl,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof UpdateUserData] === undefined) {
        delete payload[key as keyof UpdateUserData];
      }
    });

    const updated = await this.update(id, payload);
    return this.sanitize(updated);
  }

  async uploadMyPhoto(id: string, filePath: string) {
    const updated = await this.update(id, {
      photoUrl: toPublicUploadUrl(filePath),
    });

    return {
      message: 'Profile photo uploaded successfully',
      data: {
        user: this.sanitize(updated),
      },
    };
  }

  async listUsersForAdmin(query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const result = await this.userRepository.listUsers({
      page,
      limit,
      search: query.search,
      role: query.role,
      isEmailVerified: query.isEmailVerified,
      isActive: query.isActive,
      sortBy: query.sortBy ?? 'createdAt',
      sortOrder: query.sortOrder ?? 'desc',
    });

    return {
      items: result.items.map((user) => this.sanitize(user)),
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
      },
    };
  }

  async getUserDetailsForAdmin(targetUserId: string) {
    const user = await this.userRepository.findDetailsById(targetUserId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user: this.sanitize(user),
      candidateProfile: user.candidateProfile,
      recruiterProfile: user.recruiterProfile,
    };
  }

  async verifyUserEmailByAdmin(targetUserId: string) {
    const user = await this.findById(targetUserId);

    if (user.isEmailVerified) {
      return {
        data: {
          user: this.sanitize(user),
        },
        message: 'User email is already verified',
      };
    }

    const updated = await this.update(targetUserId, {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });

    return {
      data: {
        user: this.sanitize(updated),
      },
      message: 'User email verified successfully',
    };
  }

  async setUserSuspensionByAdmin(
    actorUserId: string,
    targetUserId: string,
    isActive: boolean,
  ) {
    if (actorUserId === targetUserId) {
      throw new ForbiddenException('You cannot suspend your own account');
    }

    const targetUser = await this.findById(targetUserId);

    if (targetUser.isActive === isActive) {
      return {
        data: {
          user: this.sanitize(targetUser),
        },
        message: isActive
          ? 'User account is already active'
          : 'User account is already suspended',
      };
    }

    const updated = await this.update(targetUserId, {
      isActive,
      // If suspended, invalidate current refresh token immediately.
      refreshToken: isActive ? undefined : null,
    });

    return {
      data: {
        user: this.sanitize(updated),
      },
      message: isActive
        ? 'User account unsuspended successfully'
        : 'User account suspended successfully',
    };
  }

  async updateUserByAdmin(targetUserId: string, dto: UpdateUserByAdminDto) {
    const current = await this.findById(targetUserId);

    const normalizedEmail = dto.email?.toLowerCase().trim();
    if (
      normalizedEmail &&
      normalizedEmail !== current.email.toLowerCase().trim()
    ) {
      const existing = await this.userRepository.findByEmail(normalizedEmail);
      if (existing && existing.id !== targetUserId) {
        throw new ConflictException('Email is already in use');
      }
    }

    const payload: Partial<UpdateUserData> = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: normalizedEmail,
      phone: dto.phone,
      address: dto.address,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key as keyof UpdateUserData] === undefined) {
        delete payload[key as keyof UpdateUserData];
      }
    });

    const updated = await this.update(targetUserId, payload);
    return {
      data: {
        user: this.sanitize(updated),
      },
      message: 'User updated successfully',
    };
  }

  /** Returns user without sensitive fields */
  sanitize(
    user: User,
  ): Omit<
    User,
    | 'password'
    | 'refreshToken'
    | 'passwordResetToken'
    | 'emailVerificationToken'
    | 'googleId'
  > {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      emailVerificationExpires: user.emailVerificationExpires,
      passwordResetExpires: user.passwordResetExpires,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      firstName: user.firstName,
      lastName: user.lastName,
      address: user.address,
      phone: user.phone,
      photoUrl: user.photoUrl,
      isActive: user.isActive,
    };
  }
}
