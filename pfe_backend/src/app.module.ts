import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import appConfig from './config/app.config';
import googleConfig from './config/google.config';
import jwtConfig from './config/jwt.config';
import mailConfig from './config/mail.config';
import throttleConfig from './config/throttle.config';

import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProfilesModule } from './modules/profiles/profiles.module';

import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ResumesModule } from './modules/resumes/resumes.module';
import { JobOffersModule } from './modules/job-offers/job-offers.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { InterviewsModule } from './modules/interviews/interviews.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { JobReportsModule } from './modules/job-reports/job-reports.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, googleConfig, jwtConfig, mailConfig, throttleConfig],
    }),

    // ── Rate limiting ────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          {
            ttl: Number.parseInt(process.env.THROTTLE_TTL, 10) || 60,
            limit: Number.parseInt(process.env.THROTTLE_LIMIT, 10) || 10,
          },
        ],
      }),
    }),

    // ── Database ─────────────────────────────────────────────
    DatabaseModule,

    // ── Feature modules ──────────────────────────────────────
    AuthModule,
    UserModule,
    ProfilesModule,
    ResumesModule,
    JobOffersModule,
    ApplicationsModule,
    InterviewsModule,
    RecommendationsModule,
    JobReportsModule,
    AdminModule,
  ],
  providers: [
    // Rate limiting — applied globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Apply JWT guard globally; use @Public() to opt-out
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Apply RBAC guard globally; use @Roles() to restrict
    { provide: APP_GUARD, useClass: RolesGuard },
    // Global exception filter
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Global response interceptor — wraps all responses
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
