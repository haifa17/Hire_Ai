import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Request } from 'express';
import { GoogleOAuthProfile } from '../interfaces/auth.interface';
import { GoogleOAuthStateService } from '../services/google-oauth-state.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly googleOAuthStateService: GoogleOAuthStateService,
  ) {
    const clientID = configService.get<string>('google.clientId');
    const clientSecret = configService.get<string>('google.clientSecret');
    const callbackURL =
      configService.get<string>('google.callbackUrl') ||
      'http://localhost:3000/api/v1/auth/google/callback';
    const isEnabled = !!clientID && !!clientSecret;

    super({
      clientID: clientID ?? 'google-oauth-disabled',
      clientSecret: clientSecret ?? 'google-oauth-disabled',
      callbackURL,
      passReqToCallback: true,
      scope: ['email', 'profile'],
    });

    if (!isEnabled) {
      this.logger.warn(
        'Google OAuth is disabled because GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured.',
      );
    }
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const emails = profile.emails ?? [];
    const email = emails[0]?.value?.trim().toLowerCase();

    if (!email) {
      return done(new UnauthorizedException('Google account email is missing'));
    }

    const oauthState = this.googleOAuthStateService.parseState(
      typeof req.query.state === 'string' ? req.query.state : undefined,
    );
    const givenName = profile.name?.givenName?.trim();
    const familyName = profile.name?.familyName?.trim();
    const displayName = profile.displayName?.trim() || '';
    const [fallbackFirstName, ...fallbackLastParts] = displayName.split(' ');
    const fallbackLastName = fallbackLastParts.join(' ').trim();

    const googleProfile: GoogleOAuthProfile = {
      googleId: profile.id,
      email,
      firstName: givenName || fallbackFirstName || 'Google',
      lastName: familyName || fallbackLastName || 'User',
      photoUrl: profile.photos?.[0]?.value ?? null,
      role: oauthState.role,
    };

    return done(null, googleProfile);
  }
}
