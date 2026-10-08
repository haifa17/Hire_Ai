import {
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { GoogleOAuthStateService } from '../services/google-oauth-state.service';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly googleOAuthStateService: GoogleOAuthStateService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');

    if (!clientId || !clientSecret) {
      const request = context.switchToHttp().getRequest<Request>();

      if (request.path.endsWith('/google/callback')) {
        const response = context.switchToHttp().getResponse();
        const frontendUrl = new URL(
          '/login?google=unavailable',
          this.configService.get<string>('app.frontendUrl') ??
            'http://localhost:3001',
        );
        response.redirect(frontendUrl.toString());
        return false;
      }

      throw new ServiceUnavailableException(
        'Google sign-in is currently unavailable because OAuth credentials are not configured.',
      );
    }

    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const options: Record<string, unknown> = {
      scope: ['email', 'profile'],
      session: false,
      prompt: 'select_account',
      callbackURL:
        this.configService.get<string>('google.callbackUrl') ??
        'http://localhost:3000/api/v1/auth/google/callback',
    };

    if (!request.path.endsWith('/google/callback')) {
      const flow =
        typeof request.query.flow === 'string' ? request.query.flow : undefined;
      const role =
        typeof request.query.role === 'string' ? request.query.role : undefined;

      options.state = this.googleOAuthStateService.createState(flow, role);
    }

    return options;
  }

  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const request = context.switchToHttp().getRequest<Request>();

      if (request.path.endsWith('/google/callback')) {
        return null;
      }

      throw err ?? new UnauthorizedException('Google authentication failed');
    }

    return user;
  }
}
