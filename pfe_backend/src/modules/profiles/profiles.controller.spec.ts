import { Test, TestingModule } from '@nestjs/testing';

import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

describe('ProfilesController', () => {
  let controller: ProfilesController;
  const profilesService = {
    getMyCandidateProfile: jest.fn(),
    getCandidateProfileByUserId: jest.fn(),
    createCandidateProfile: jest.fn(),
    updateCandidateProfile: jest.fn(),
    uploadCandidatePhoto: jest.fn(),
    deleteCandidateProfile: jest.fn(),
    getMyRecruiterProfile: jest.fn(),
    createRecruiterProfile: jest.fn(),
    updateRecruiterProfile: jest.fn(),
    updateRecruiterCompany: jest.fn(),
    uploadRecruiterCompanyLogo: jest.fn(),
    deleteRecruiterProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: profilesService }],
    }).compile();

    controller = module.get<ProfilesController>(ProfilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMyCandidateProfile delegates with current user id', () => {
    profilesService.getMyCandidateProfile.mockReturnValue({ user: {} });

    const result = controller.getMyCandidateProfile({ id: 'user-1' } as any);

    expect(profilesService.getMyCandidateProfile).toHaveBeenCalledWith(
      'user-1',
    );
    expect(result).toEqual({ user: {} });
  });

  it('createCandidateProfile delegates to the service', async () => {
    profilesService.createCandidateProfile.mockResolvedValue({ profile: {} });

    const result = await controller.createCandidateProfile(
      { id: 'user-1' } as any,
      {} as any,
    );

    expect(profilesService.createCandidateProfile).toHaveBeenCalledWith(
      'user-1',
      {},
    );
    expect(result).toEqual({ profile: {} });
  });

  it('uploadCandidatePhoto forwards the uploaded file path', async () => {
    profilesService.uploadCandidatePhoto.mockResolvedValue({ message: 'ok' });

    const result = await controller.uploadCandidatePhoto(
      { id: 'user-1' } as any,
      { path: '/uploads/photo.png' } as any,
    );

    expect(profilesService.uploadCandidatePhoto).toHaveBeenCalledWith(
      'user-1',
      '/uploads/photo.png',
    );
    expect(result).toEqual({ message: 'ok' });
  });

  it('uploadCertificationFile returns a public url payload', () => {
    const result = controller.uploadCertificationFile(
      { id: 'user-1' } as any,
      { path: 'uploads/profiles/certifications/file.pdf' } as any,
    );

    expect(result.message).toContain('uploaded successfully');
    expect(result.data.url).toContain('file.pdf');
  });

  it('deleteCandidateProfile delegates to the service', async () => {
    profilesService.deleteCandidateProfile.mockResolvedValue({ message: 'ok' });

    const result = await controller.deleteCandidateProfile({
      id: 'user-1',
    } as any);

    expect(profilesService.deleteCandidateProfile).toHaveBeenCalledWith(
      'user-1',
    );
    expect(result).toEqual({ message: 'ok' });
  });

  it('updateRecruiterCompany delegates to the service', async () => {
    profilesService.updateRecruiterCompany.mockResolvedValue({ message: 'ok' });

    const result = await controller.updateRecruiterCompany(
      { id: 'user-2' } as any,
      { companyId: 'c1' } as any,
    );

    expect(profilesService.updateRecruiterCompany).toHaveBeenCalledWith(
      'user-2',
      { companyId: 'c1' },
    );
    expect(result).toEqual({ message: 'ok' });
  });
});
