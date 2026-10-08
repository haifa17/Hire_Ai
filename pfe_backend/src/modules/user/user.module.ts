import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserRepositoryImpl } from './repositories/user.repository';
import { UserController } from './user.controller';

@Module({
  controllers: [UserController],
  providers: [UserService, UserRepositoryImpl],
  exports: [UserService, UserRepositoryImpl],
})
export class UserModule {}
