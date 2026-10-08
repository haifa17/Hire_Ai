import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { MailService } from '../src/modules/common/mail/mail.service';

describe('Auth flows (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  const mailServiceMock = {
    sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register creates a user and requests verification', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null); // findByEmail via repository
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'newuser@example.com',
    });

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'newuser@example.com',
        password: 'Password1!',
        role: 'CANDIDATE',
      })
      .expect(201);

    expect(res.body.data.message).toContain('Registration successful');
    expect(mailServiceMock.sendEmailVerification).toHaveBeenCalled();
  });

  it('POST /api/auth/register returns 400 for an invalid payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login returns 401 for unknown credentials', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'missing@example.com', password: 'Password1!' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login succeeds with valid credentials and sets a refresh cookie', async () => {
    const hashed = await bcrypt.hash('Password1!', 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'jane@example.com',
      password: hashed,
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'CANDIDATE',
      isActive: true,
      isEmailVerified: true,
    });
    prismaMock.user.update.mockResolvedValue({});

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'jane@example.com', password: 'Password1!' })
      .expect(200);

    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('GET /api/users/me requires authentication', async () => {
    const res = await request(app.getHttpServer()).get('/users/me').expect(401);
    expect(res.body.success).toBe(false);
  });
});
