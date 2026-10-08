import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Profiles (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  const candidateUser = {
    id: 'candidate-1',
    email: 'candidate@example.com',
    role: 'CANDIDATE',
    firstName: 'Jane',
    lastName: 'Doe',
    photoUrl: null,
    phone: null,
    address: null,
  };

  const prismaMock = {
    user: { findUnique: jest.fn() },
    candidateProfile: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((cb: any) =>
      cb({
        user: { update: jest.fn() },
        candidateProfile: { create: jest.fn() },
      }),
    ),
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

  it('GET /api/profiles/candidate/me returns 404 when no profile exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(candidateUser);
    prismaMock.candidateProfile.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/profiles/candidate/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('GET /api/profiles/candidate/me returns the profile when it exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(candidateUser);
    prismaMock.candidateProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      userId: 'candidate-1',
      desiredSalary: null,
    });

    const res = await request(app.getHttpServer())
      .get('/profiles/candidate/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.profile.id).toBe('profile-1');
  });
});
