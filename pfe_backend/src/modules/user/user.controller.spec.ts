import { Test, TestingModule } from '@nestjs/testing';

import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  let controller: UserController;
  const userService = {
    listUsersForAdmin: jest.fn(),
    getUserDetailsForAdmin: jest.fn(),
    verifyUserEmailByAdmin: jest.fn(),
    setUserSuspensionByAdmin: jest.fn(),
    updateUserByAdmin: jest.fn(),
    sanitize: jest.fn(),
    updateSelf: jest.fn(),
    uploadMyPhoto: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: userService }],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('listUsers delegates to userService.listUsersForAdmin', async () => {
    userService.listUsersForAdmin.mockResolvedValue({ items: [] });

    const result = await controller.listUsers({} as any);

    expect(userService.listUsersForAdmin).toHaveBeenCalled();
    expect(result).toEqual({ items: [] });
  });

  it('getUserDetails delegates to userService.getUserDetailsForAdmin', async () => {
    userService.getUserDetailsForAdmin.mockResolvedValue({ user: {} });

    const result = await controller.getUserDetails('user-1');

    expect(userService.getUserDetailsForAdmin).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ user: {} });
  });

  it('setUserSuspension delegates with actor and target ids', async () => {
    userService.setUserSuspensionByAdmin.mockResolvedValue({ message: 'ok' });

    const result = await controller.setUserSuspension(
      { id: 'admin-1' } as any,
      'user-1',
      { isActive: false } as any,
    );

    expect(userService.setUserSuspensionByAdmin).toHaveBeenCalledWith(
      'admin-1',
      'user-1',
      false,
    );
    expect(result).toEqual({ message: 'ok' });
  });

  it('getMe returns sanitized current user', () => {
    userService.sanitize.mockReturnValue({ id: 'user-1' });

    const result = controller.getMe({ id: 'user-1' } as any);

    expect(userService.sanitize).toHaveBeenCalled();
    expect(result).toEqual({ id: 'user-1' });
  });

  it('updateMe delegates to userService.updateSelf', async () => {
    userService.updateSelf.mockResolvedValue({ id: 'user-1' });

    const result = await controller.updateMe(
      { id: 'user-1' } as any,
      {} as any,
    );

    expect(userService.updateSelf).toHaveBeenCalledWith('user-1', {});
    expect(result).toEqual({ id: 'user-1' });
  });

  it('uploadMyPhoto delegates to userService.uploadMyPhoto with file path', async () => {
    userService.uploadMyPhoto.mockResolvedValue({ message: 'ok' });

    const result = await controller.uploadMyPhoto(
      { id: 'user-1' } as any,
      {
        path: '/uploads/photo.png',
      } as any,
    );

    expect(userService.uploadMyPhoto).toHaveBeenCalledWith(
      'user-1',
      '/uploads/photo.png',
    );
    expect(result).toEqual({ message: 'ok' });
  });
});
