import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtRefreshPayload } from '../interfaces/auth.interface';
import { UserService } from '../../user/user.service';

const REFRESH_COOKIE_NAME = 'refresh_token';

function extractRefreshTokenFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [name, ...rest] = part.trim().split('=');
    if (name === REFRESH_COOKIE_NAME) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return null;
}

function extractRefreshTokenFromRequest(req: Request): string | null {
  return (
    extractRefreshTokenFromCookie(req) ?? (req.body?.refreshToken as string)
  );
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => extractRefreshTokenFromRequest(req),
      ]),
      secretOrKey: configService.get<string>('jwt.refreshSecret'),
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtRefreshPayload,
  ): Promise<{ userId: string; refreshToken: string }> {
    const refreshToken = extractRefreshTokenFromRequest(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const user = await this.userService.findById(payload.sub);
    if (!user?.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    return { userId: payload.sub, refreshToken };
  }
}
