import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      try {
        const res = super.canActivate(context);
        if (res instanceof Promise) {
          res.catch(() => {
            // Ignore auth error for public endpoints so unauthenticated visitors can access them
          });
        }
      } catch {
        // Ignore auth error for public endpoints so unauthenticated visitors can access them
      }
      return true;
    }

    return super.canActivate(context);
  }
}
