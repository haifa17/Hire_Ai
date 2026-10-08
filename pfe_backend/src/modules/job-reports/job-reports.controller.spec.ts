import { Test, TestingModule } from '@nestjs/testing';

import { JobReportsController } from './job-reports.controller';
import { JobReportsService } from './job-reports.service';

describe('JobReportsController', () => {
  let controller: JobReportsController;
  const service = {
    createReport: jest.fn(),
    checkUserReport: jest.fn(),
    findAllForAdmin: jest.fn(),
    resolveReport: jest.fn(),
    deleteJobFromReport: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobReportsController],
      providers: [{ provide: JobReportsService, useValue: service }],
    }).compile();

    controller = module.get<JobReportsController>(JobReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createReport delegates to service.createReport', () => {
    service.createReport.mockReturnValue({ id: 'report-1' });

    const result = controller.createReport({ id: 'user-1' } as any, {} as any);

    expect(service.createReport).toHaveBeenCalledWith({ id: 'user-1' }, {});
    expect(result).toEqual({ id: 'report-1' });
  });

  it('checkUserReport delegates with user id and job offer id', () => {
    service.checkUserReport.mockReturnValue({ hasReported: false });

    const result = controller.checkUserReport({ id: 'user-1' } as any, 'job-1');

    expect(service.checkUserReport).toHaveBeenCalledWith('user-1', 'job-1');
    expect(result).toEqual({ hasReported: false });
  });

  it('resolveReport delegates to service.resolveReport', () => {
    service.resolveReport.mockReturnValue({ id: 'report-1' });

    const result = controller.resolveReport('report-1');

    expect(service.resolveReport).toHaveBeenCalledWith('report-1');
    expect(result).toEqual({ id: 'report-1' });
  });

  it('deleteJobFromReport delegates to service.deleteJobFromReport', () => {
    service.deleteJobFromReport.mockReturnValue({ message: 'ok' });

    const result = controller.deleteJobFromReport('job-1');

    expect(service.deleteJobFromReport).toHaveBeenCalledWith('job-1');
    expect(result).toEqual({ message: 'ok' });
  });
});
