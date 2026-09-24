import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendshipController } from './friendship.controller';
import {
  FriendshipDocument,
  FriendshipSchema,
} from 'src/modules/friendship/infrastructure/friendship.schema';
import { FriendshipRepository } from 'src/modules/friendship/infrastructure/friendship.repository';
import { IFriendshipRepository } from 'src/modules/friendship/domain/i-friendship.repository';
import { UserModule } from 'src/modules/user/interfaces/users.module';
import { ConversationsModule } from 'src/modules/conversation/interfaces/conversations.module';
import { FileModule } from 'src/modules/file/interfaces/file.module';
import { SendFriendRequestUseCase } from 'src/modules/friendship/application/use-cases/send-friend-request.usecase';
import { SendFriendRequestByCodeUseCase } from 'src/modules/friendship/application/use-cases/send-friend-request-by-code.usecase';
import { AcceptFriendRequestUseCase } from 'src/modules/friendship/application/use-cases/accept-friend-request.usecase';
import { RejectFriendRequestUseCase } from 'src/modules/friendship/application/use-cases/reject-friend-request.usecase';
import { CancelFriendRequestUseCase } from 'src/modules/friendship/application/use-cases/cancel-friend-request.usecase';
import { UnfriendUseCase } from 'src/modules/friendship/application/use-cases/unfriend.usecase';
import { BlockUserUseCase } from 'src/modules/friendship/application/use-cases/block-user.usecase';
import { UnblockUserUseCase } from 'src/modules/friendship/application/use-cases/unblock-user.usecase';
import {
  ListFriendsUseCase,
  ListIncomingRequestsUseCase,
  ListOutgoingRequestsUseCase,
} from 'src/modules/friendship/application/use-cases/list-friendships.usecase';
import { AutoCreateDirectConversationListener } from 'src/modules/friendship/application/listeners/auto-create-direct-conversation.listener';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FriendshipDocument.name, schema: FriendshipSchema },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => ConversationsModule),
    FileModule,
  ],
  controllers: [FriendshipController],
  providers: [
    { provide: IFriendshipRepository, useClass: FriendshipRepository },
    SendFriendRequestUseCase,
    SendFriendRequestByCodeUseCase,
    AcceptFriendRequestUseCase,
    RejectFriendRequestUseCase,
    CancelFriendRequestUseCase,
    UnfriendUseCase,
    BlockUserUseCase,
    UnblockUserUseCase,
    ListFriendsUseCase,
    ListIncomingRequestsUseCase,
    ListOutgoingRequestsUseCase,
    AutoCreateDirectConversationListener,
  ],
  exports: [IFriendshipRepository],
})
export class FriendshipModule {}
