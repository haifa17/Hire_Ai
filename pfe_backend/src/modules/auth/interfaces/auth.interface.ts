import { Role } from '@prisma/client';
import { Request } from 'express';

export type GoogleOAuthFlow = 'signin' | 'signup';
export type GoogleOAuthSignupRole = 'CANDIDATE' | 'RECRUITER';

export interface GoogleOAuthQuery {
  flow?: GoogleOAuthFlow;
  role?: Role;
}

export interface GoogleOAuthStatePayload {
  flow: GoogleOAuthFlow;
  role: GoogleOAuthSignupRole;
  issuedAt: number;
}

export interface GoogleOAuthProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  role?: Role;
}

export interface GoogleOAuthRequest extends Request {
  user?: GoogleOAuthProfile;
  googleOAuthState?: GoogleOAuthStatePayload;
  query: Request['query'] & GoogleOAuthQuery;
}

export interface JwtPayload {
  sub: string; // user UUID
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload extends JwtPayload {
  refreshTokenId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    isEmailVerified: boolean;
  };
  tokens: AuthTokens;
}
