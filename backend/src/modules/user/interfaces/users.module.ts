import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UserDocument, UserSchema } from 'src/modules/user/infrastructure/user.schema';
import { UserRepository } from 'src/modules/user/infrastructure/user.repository';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import {
  GetAllUsersUseCase,
  GetUserByIdUseCase,
  DeleteUserUseCase,
} from 'src/modules/user/application/use-cases/get-users.usecase';
import { GetOrCreateFriendCodeUseCase } from 'src/modules/user/application/use-cases/get-or-create-friend-code.usecase';
import { RegenerateFriendCodeUseCase } from 'src/modules/user/application/use-cases/regenerate-friend-code.usecase';
import { GetUserByFriendCodeUseCase } from 'src/modules/user/application/use-cases/get-user-by-friend-code.usecase';
import { UpdateUserAvatarUseCase } from 'src/modules/user/application/use-cases/update-user-avatar.usecase';
import { GetProfileUseCase } from 'src/modules/user/application/use-cases/get-profile.usecase';
import { FileModule } from 'src/modules/file/interfaces/file.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserDocument.name, schema: UserSchema }]),
    FileModule,
  ],
  controllers: [UsersController],
  providers: [
    { provide: IUserRepository, useClass: UserRepository },
    GetAllUsersUseCase,
    GetUserByIdUseCase,
    DeleteUserUseCase,
    GetOrCreateFriendCodeUseCase,
    RegenerateFriendCodeUseCase,
    GetUserByFriendCodeUseCase,
    UpdateUserAvatarUseCase,
    GetProfileUseCase,
  ],
  // GetProfileUseCase export để AuthController dùng cho GET /auth/profile.
  exports: [IUserRepository, GetProfileUseCase],
})
export class UserModule {}
