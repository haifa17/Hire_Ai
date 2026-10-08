import { Test, TestingModule } from '@nestjs/testing';

import { JobOffersController } from './job-offers.controller';
import { JobOffersService } from './job-offers.service';
import { JobOfferOwnershipGuard } from './guards/job-offer-ownership.guard';

describe('JobOffersController', () => {
  let controller: JobOffersController;
  const service = {
    create: jest.fn(),
    aiGenerate: jest.fn(),
    findPublic: jest.fn(),
    findCompanyMine: jest.fn(),
    findAdminAll: jest.fn(),
    findBySlug: jest.fn(),
    findPublicById: jest.fn(),
    topCandidates: jest.fn(),
    analytics: jest.fn(),
    findOneOwned: jest.fn(),
    update: jest.fn(),
    publish: jest.fn(),
    close: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobOffersController],
      providers: [{ provide: JobOffersService, useValue: service }],
    })
      .overrideGuard(JobOfferOwnershipGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<JobOffersController>(JobOffersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to service.create', () => {
    service.create.mockReturnValue({ id: 'job-1' });

    const result = controller.create({ id: 'user-1' } as any, {} as any);

    expect(service.create).toHaveBeenCalledWith({ id: 'user-1' }, {});
    expect(result).toEqual({ id: 'job-1' });
  });

  it('findAllPublic delegates to service.findPublic', () => {
    service.findPublic.mockReturnValue({ items: [] });

    const result = controller.findAllPublic({} as any);

    expect(service.findPublic).toHaveBeenCalled();
    expect(result).toEqual({ items: [] });
  });

  it('findBySlug forwards resolved client ip', () => {
    service.findBySlug.mockReturnValue({ id: 'job-1' });

    controller.findBySlug(
      'slug-1',
      { id: 'user-1' } as any,
      { headers: {}, ip: '127.0.0.1' } as any,
    );

    expect(service.findBySlug).toHaveBeenCalledWith(
      'slug-1',
      { id: 'user-1' },
      '127.0.0.1',
    );
  });

  it('publish delegates to service.publish', () => {
    service.publish.mockReturnValue({ id: 'job-1', status: 'PUBLISHED' });

    const result = controller.publish('job-1');

    expect(service.publish).toHaveBeenCalledWith('job-1');
    expect(result).toEqual({ id: 'job-1', status: 'PUBLISHED' });
  });

  it('remove delegates to service.remove', () => {
    service.remove.mockReturnValue({ message: 'ok' });

    const result = controller.remove('job-1');

    expect(service.remove).toHaveBeenCalledWith('job-1');
    expect(result).toEqual({ message: 'ok' });
  });
});
