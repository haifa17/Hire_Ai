import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MailService } from '../src/modules/common/mail/mail.service';

describe('Interviews (e2e)', () => {
  let app: INestApplication;
  let recruiterToken: string;

  const recruiterUser = {
    id: 'recruiter-1',
    email: 'recruiter@example.com',
    role: 'RECRUITER',
  };

  const prismaMock = {
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
    interview: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    jobOffer: { findUnique: jest.fn() },
    application: { findUnique: jest.fn() },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const mailServiceMock = {
    sendInterviewInvitation: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(MailService)
      .useValue(mailServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const jwtService = app.get(JwtService);
    const configService = app.get(ConfigService);
    recruiterToken = await jwtService.signAsync(
      {
        sub: recruiterUser.id,
        email: recruiterUser.email,
        role: recruiterUser.role,
      },
      {
        secret: configService.get<string>('jwt.accessSecret'),
        expiresIn: '15m',
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    prismaMock.user.findUnique.mockResolvedValue(recruiterUser);
  });

  it('GET /api/interviews/me requires authentication', async () => {
    await request(app.getHttpServer()).get('/interviews/me').expect(401);
  });

  it('GET /api/interviews/me returns interviews for the recruiter', async () => {
    prismaMock.interview.findMany.mockResolvedValue([{ id: 'interview-1' }]);

    const res = await request(app.getHttpServer())
      .get('/interviews/me')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .expect(200);

    expect(res.body.data).toEqual([{ id: 'interview-1' }]);
  });

  it('POST /api/interviews rejects a past scheduledAt with 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        title: 'Tech round',
        interviewType: 'VIDEO',
        scheduledAt: new Date(Date.now() - 60_000).toISOString(),
        duration: 30,
        candidateId: 'candidate-1',
        jobOfferId: 'job-1',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
