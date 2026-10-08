import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Resumes (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  const candidateUser = {
    id: 'candidate-1',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
  };

  const prismaMock = {
    user: { findUnique: jest.fn() },
    resume: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
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
    accessToken = await jwtService.signAsync(
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

  it('GET /api/resumes requires authentication', async () => {
    await request(app.getHttpServer()).get('/resumes').expect(401);
  });

  it('GET /api/resumes returns the candidate resumes list', async () => {
    prismaMock.resume.findMany.mockResolvedValue([{ id: 'resume-1' }]);

    const res = await request(app.getHttpServer())
      .get('/resumes')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data).toEqual([{ id: 'resume-1' }]);
  });

  it('GET /api/resumes/:id returns 404 for an unknown resume', async () => {
    prismaMock.resume.findFirst.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/resumes/missing-id')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/resumes/:id removes an owned resume', async () => {
    prismaMock.resume.findFirst.mockResolvedValue({
      id: 'resume-1',
      candidateId: candidateUser.id,
    });
    prismaMock.resume.delete.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .delete('/resumes/resume-1')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.message).toContain('deleted successfully');
  });
});
