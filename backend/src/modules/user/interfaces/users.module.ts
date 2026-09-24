import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UserDocument, UserSchema } from 'src/modules/user/infrastructure/user.schema';
import { UserRepository } from 'src/modules/user/infrastructure/user.repository';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import {
  GetUserByIdUseCase,
  DeleteUserUseCase,
} from 'src/modules/user/application/use-cases/get-users.usecase';
import { GetOrCreateFriendCodeUseCase } from 'src/modules/user/application/use-cases/get-or-create-friend-code.usecase';
import { RegenerateFriendCodeUseCase } from 'src/modules/user/application/use-cases/regenerate-friend-code.usecase';
import { GetUserByFriendCodeUseCase } from 'src/modules/user/application/use-cases/get-user-by-friend-code.usecase';
import { UpdateUserAvatarUseCase } from 'src/modules/user/application/use-cases/update-user-avatar.usecase';
import { GetProfileUseCase } from 'src/modules/user/application/use-cases/get-profile.usecase';
import { UpdatePresenceSettingsUseCase } from 'src/modules/user/application/use-cases/update-presence-settings.usecase';
import { UpdateExpressiveChatSettingsUseCase } from 'src/modules/user/application/use-cases/update-expressive-chat-settings.usecase';
import { GetFriendsPresenceUseCase } from 'src/modules/user/application/use-cases/get-friends-presence.usecase';
import { FileModule } from 'src/modules/file/interfaces/file.module';
import { FriendshipModule } from 'src/modules/friendship/interfaces/friendship.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserDocument.name, schema: UserSchema }]),
    FileModule,
    forwardRef(() => FriendshipModule),
  ],
  controllers: [UsersController],
  providers: [
    { provide: IUserRepository, useClass: UserRepository },
    GetUserByIdUseCase,
    DeleteUserUseCase,
    GetOrCreateFriendCodeUseCase,
    RegenerateFriendCodeUseCase,
    GetUserByFriendCodeUseCase,
    UpdateUserAvatarUseCase,
    GetProfileUseCase,
    UpdatePresenceSettingsUseCase,
    UpdateExpressiveChatSettingsUseCase,
    GetFriendsPresenceUseCase,
  ],
  // GetProfileUseCase export để AuthController dùng cho GET /auth/profile.
  exports: [IUserRepository, GetProfileUseCase],
})
export class UserModule {}
