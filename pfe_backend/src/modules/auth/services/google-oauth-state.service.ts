import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  GoogleOAuthSignupRole,
  GoogleOAuthStatePayload,
} from '../interfaces/auth.interface';

const DEFAULT_STATE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class GoogleOAuthStateService {
  constructor(private readonly configService: ConfigService) {}

  createState(flow?: string, role?: string): string {
    const payload = this.buildPayload(flow, role);
    const encodedPayload = this.encodePayload(payload);
    const signature = this.sign(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  parseState(state?: string): GoogleOAuthStatePayload {
    if (!state) {
      throw new UnauthorizedException('Missing Google OAuth state');
    }

    const [encodedPayload, signature] = state.split('.');
    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid Google OAuth state');
    }

    const expectedSignature = this.sign(encodedPayload);
    const provided = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new UnauthorizedException('Invalid Google OAuth state');
    }

    let payload: GoogleOAuthStatePayload;
    try {
      payload = JSON.parse(
        this.decodePayload(encodedPayload),
      ) as GoogleOAuthStatePayload;
    } catch {
      throw new UnauthorizedException('Invalid Google OAuth state');
    }

    if (!this.isValidPayload(payload)) {
      throw new UnauthorizedException('Invalid Google OAuth state');
    }

    if (Date.now() - payload.issuedAt > this.getStateTtlMs()) {
      throw new UnauthorizedException('Expired Google OAuth state');
    }

    return payload;
  }

  private buildPayload(flow?: string, role?: string): GoogleOAuthStatePayload {
    return {
      flow: flow === 'signup' ? 'signup' : 'signin',
      role: this.normalizeRole(role),
      issuedAt: Date.now(),
    };
  }

  private normalizeRole(role?: string): GoogleOAuthSignupRole {
    return role === 'RECRUITER' ? 'RECRUITER' : 'CANDIDATE';
  }

  private isValidPayload(payload: unknown): payload is GoogleOAuthStatePayload {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const candidate = payload as Partial<GoogleOAuthStatePayload>;
    return (
      (candidate.flow === 'signin' || candidate.flow === 'signup') &&
      (candidate.role === 'CANDIDATE' || candidate.role === 'RECRUITER') &&
      typeof candidate.issuedAt === 'number' &&
      Number.isFinite(candidate.issuedAt)
    );
  }

  private encodePayload(payload: GoogleOAuthStatePayload): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private decodePayload(encodedPayload: string): string {
    return Buffer.from(encodedPayload, 'base64url').toString('utf8');
  }

  private sign(encodedPayload: string): string {
    const secret = this.getStateSecret();

    return createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('base64url');
  }

  private getStateSecret(): string {
    const secret =
      this.configService.get<string>('google.stateSecret') ??
      this.configService.get<string>('google.clientSecret');

    if (!secret) {
      throw new UnauthorizedException(
        'Google OAuth is not configured correctly',
      );
    }

    return secret;
  }

  private getStateTtlMs(): number {
    return (
      this.configService.get<number>('google.stateTtlMs') ??
      DEFAULT_STATE_TTL_MS
    );
  }
}
