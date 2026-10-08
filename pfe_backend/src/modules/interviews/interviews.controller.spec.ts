import { Test, TestingModule } from '@nestjs/testing';

import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

describe('InterviewsController', () => {
  let controller: InterviewsController;
  const service = {
    create: jest.fn(),
    findMine: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getRecruiterAvailability: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InterviewsController],
      providers: [{ provide: InterviewsService, useValue: service }],
    }).compile();

    controller = module.get<InterviewsController>(InterviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create delegates to service.create', () => {
    service.create.mockReturnValue({ id: 'i1' });

    const result = controller.create({ id: 'recruiter-1' } as any, {} as any);

    expect(service.create).toHaveBeenCalledWith({ id: 'recruiter-1' }, {});
    expect(result).toEqual({ id: 'i1' });
  });

  it('findMine delegates to service.findMine', () => {
    service.findMine.mockReturnValue([]);

    const result = controller.findMine({ id: 'user-1' } as any);

    expect(service.findMine).toHaveBeenCalledWith({ id: 'user-1' });
    expect(result).toEqual([]);
  });

  it('update delegates to service.update', () => {
    service.update.mockReturnValue({ id: 'i1' });

    const result = controller.update({ id: 'recruiter-1' } as any, 'i1', {
      status: 'CANCELLED',
    } as any);

    expect(service.update).toHaveBeenCalledWith({ id: 'recruiter-1' }, 'i1', {
      status: 'CANCELLED',
    });
    expect(result).toEqual({ id: 'i1' });
  });

  it('remove delegates to service.remove', () => {
    service.remove.mockReturnValue({ message: 'ok' });

    const result = controller.remove({ id: 'recruiter-1' } as any, 'i1');

    expect(service.remove).toHaveBeenCalledWith({ id: 'recruiter-1' }, 'i1');
    expect(result).toEqual({ message: 'ok' });
  });

  it('availability delegates to service.getRecruiterAvailability', () => {
    service.getRecruiterAvailability.mockReturnValue({ busySlots: [] });

    const result = controller.availability(
      { id: 'recruiter-1' } as any,
      'recruiter-1',
      {} as any,
    );

    expect(service.getRecruiterAvailability).toHaveBeenCalledWith(
      { id: 'recruiter-1' },
      'recruiter-1',
      {},
    );
    expect(result).toEqual({ busySlots: [] });
  });
});
