import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, static as expressStatic, urlencoded } from 'express';
import {
  UPLOADS_ROOT,
  ensureDirectory,
} from './common/upload/multer-upload.util';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port') ?? 3000;
  const frontendUrl = config.get<string>('app.frontendUrl');
  const nodeEnv = config.get<string>('app.nodeEnv') ?? 'development';
  const accessSecret = config.get<string>('jwt.accessSecret');
  const refreshSecret = config.get<string>('jwt.refreshSecret');

  if (!accessSecret || !refreshSecret) {
    throw new Error(
      'Missing JWT secrets: both JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required.',
    );
  }

  let validatedFrontendUrl: string;
  try {
    const parsed = new URL(frontendUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('FRONTEND_URL must use http or https protocol.');
    }
    validatedFrontendUrl = parsed.origin;
  } catch {
    throw new Error('Invalid FRONTEND_URL. Expected an absolute URL.');
  }

  // ── Security headers ─────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────
  const allowedOrigins = [validatedFrontendUrl];
  if (nodeEnv !== 'production') {
    allowedOrigins.push('http://localhost:5173', 'http://localhost:3001');
  }

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Request body limits ──────────────────────────────────────
  // Profile creation currently sends image data URL in JSON payload.
  // Increase parser limits to prevent PayloadTooLargeError.
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ limit: '20mb', extended: true }));

  // ── Static uploads ──────────────────────────────────────────
  ensureDirectory(UPLOADS_ROOT);
  app.use('/uploads', expressStatic(UPLOADS_ROOT));

  // ── Global prefix ────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── Validation pipe ───────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true, // auto-transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger ──────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TalentBridge AI API')
    .setDescription('AI-powered recruitment platform REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'Register, login, token management')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`🚀 Application running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger docs available at: http://localhost:${port}/api/docs`);
}

bootstrap();
