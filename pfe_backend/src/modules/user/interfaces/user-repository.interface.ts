import { User } from '@prisma/client';

export interface ListUsersQueryInput {
  page: number;
  limit: number;
  search?: string;
  role?: import('@prisma/client').Role;
  isEmailVerified?: boolean;
  isActive?: boolean;
  sortBy: 'createdAt' | 'email' | 'firstName' | 'lastName';
  sortOrder: 'asc' | 'desc';
}

export interface ListUsersResult {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findDetailsById(id: string): Promise<
    | (User & {
        candidateProfile: import('@prisma/client').CandidateProfile | null;
        recruiterProfile:
          | (import('@prisma/client').RecruiterProfile & {
              company: import('@prisma/client').Company;
            })
          | null;
      })
    | null
  >;
  findByEmail(email: string): Promise<User | null>;
  findByEmailVerificationToken(token: string): Promise<User | null>;
  findByPasswordResetToken(token: string): Promise<User | null>;
  listUsers(query: ListUsersQueryInput): Promise<ListUsersResult>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: Partial<UpdateUserData>): Promise<User>;
  delete(id: string): Promise<void>;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  googleId?: string | null;
  photoUrl?: string | null;
  isEmailVerified?: boolean;
  role?: import('@prisma/client').Role;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  googleId?: string | null;
  role?: import('@prisma/client').Role;
  isActive?: boolean;
  phone?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  password?: string;
  isEmailVerified?: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  refreshToken?: string | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
}
