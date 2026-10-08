import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Applications (e2e)', () => {
  let app: INestApplication;
  let candidateToken: string;

  const candidateUser = {
    id: 'candidate-1',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
  };

  const prismaMock = {
    user: { findUnique: jest.fn() },
    application: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    jobOffer: { findFirst: jest.fn(), findUnique: jest.fn() },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const jwtService = app.get(JwtService);
    const configService = app.get(ConfigService);
    candidateToken = await jwtService.signAsync(
      {
        sub: candidateUser.id,
        email: candidateUser.email,
        role: candidateUser.role,
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
    prismaMock.user.findUnique.mockResolvedValue(candidateUser);
  });

  it('GET /api/applications/me requires authentication', async () => {
    await request(app.getHttpServer()).get('/applications/me').expect(401);
  });

  it('GET /api/applications/me returns the candidate applications', async () => {
    prismaMock.application.findMany.mockResolvedValue([{ id: 'app-1' }]);

    const res = await request(app.getHttpServer())
      .get('/applications/me')
      .set('Authorization', `Bearer ${candidateToken}`)
      .expect(200);

    expect(res.body.data).toEqual([{ id: 'app-1' }]);
  });

  it('GET /api/applications/:id returns 404 for a missing application', async () => {
    prismaMock.application.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/applications/missing-id')
      .set('Authorization', `Bearer ${candidateToken}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('POST /api/applications without a CV file returns 400', async () => {
    prismaMock.jobOffer.findFirst.mockResolvedValue({ id: 'job-1' });

    const res = await request(app.getHttpServer())
      .post('/applications')
      .set('Authorization', `Bearer ${candidateToken}`)
      .field('jobOfferId', 'job-1')
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
