import { Test, TestingModule } from '@nestjs/testing';

import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';

describe('ApplicationsController', () => {
  let controller: ApplicationsController;
  const service = {
    apply: jest.fn(),
    findMyApplications: jest.fn(),
    previewMatching: jest.fn(),
    findApplicantsForJob: jest.fn(),
    getMatchScore: jest.fn(),
    updateStatus: jest.fn(),
    findOne: jest.fn(),
    withdraw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationsController],
      providers: [{ provide: ApplicationsService, useValue: service }],
    }).compile();

    controller = module.get<ApplicationsController>(ApplicationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('apply delegates to service.apply with user, dto and files', () => {
    service.apply.mockReturnValue({ id: 'app-1' });

    const result = controller.apply({ id: 'user-1' } as any, { cv: [] }, {
      jobOfferId: 'job-1',
    } as any);

    expect(service.apply).toHaveBeenCalledWith(
      { id: 'user-1' },
      { jobOfferId: 'job-1' },
      { cv: [] },
    );
    expect(result).toEqual({ id: 'app-1' });
  });

  it('myApps delegates to service.findMyApplications', () => {
    service.findMyApplications.mockReturnValue([]);

    const result = controller.myApps({ id: 'user-1' } as any);

    expect(service.findMyApplications).toHaveBeenCalledWith({ id: 'user-1' });
    expect(result).toEqual([]);
  });

  it('getMatchScore parses the force query flag', () => {
    service.getMatchScore.mockReturnValue({});

    controller.getMatchScore({ id: 'user-1' } as any, 'app-1', 'true');

    expect(service.getMatchScore).toHaveBeenCalledWith(
      { id: 'user-1' },
      'app-1',
      true,
    );
  });

  it('updateStatus delegates with the status from the dto', () => {
    service.updateStatus.mockReturnValue({});

    controller.updateStatus({ id: 'user-1' } as any, 'app-1', {
      status: 'ACCEPTED',
    } as any);

    expect(service.updateStatus).toHaveBeenCalledWith(
      { id: 'user-1' },
      'app-1',
      'ACCEPTED',
    );
  });

  it('withdraw delegates to service.withdraw', () => {
    service.withdraw.mockReturnValue({ message: 'ok' });

    const result = controller.withdraw({ id: 'user-1' } as any, 'app-1');

    expect(service.withdraw).toHaveBeenCalledWith({ id: 'user-1' }, 'app-1');
    expect(result).toEqual({ message: 'ok' });
  });
});
