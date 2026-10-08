import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Job Offers (e2e)', () => {
  let app: INestApplication;

  const prismaMock = {
    jobOffer: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    recruiterProfile: { findUnique: jest.fn() },
    application: { findMany: jest.fn() },
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/job-offers is public and returns a paginated list', async () => {
    prismaMock.jobOffer.findMany.mockResolvedValue([]);
    prismaMock.jobOffer.count.mockResolvedValue(0);

    const res = await request(app.getHttpServer())
      .get('/job-offers')
      .expect(200);

    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('GET /api/job-offers/slug/:slug returns 404 for an unknown slug', async () => {
    prismaMock.jobOffer.findFirst.mockResolvedValue(null);

    const res = await request(app.getHttpServer())
      .get('/job-offers/slug/unknown-job')
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('POST /api/job-offers requires authentication', async () => {
    await request(app.getHttpServer())
      .post('/job-offers')
      .send({ title: 'Engineer' })
      .expect(401);
  });
});
