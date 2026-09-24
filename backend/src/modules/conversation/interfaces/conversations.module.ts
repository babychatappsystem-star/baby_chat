import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsController } from './conversations.controller';
import { ConversationDocument, ConversationSchema } from 'src/modules/conversation/infrastructure/conversation.schema';
import { ConversationRepository } from 'src/modules/conversation/infrastructure/conversation.repository';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { UserModule } from 'src/modules/user/interfaces/users.module';
import { FriendshipModule } from 'src/modules/friendship/interfaces/friendship.module';
import { PageModule } from 'src/modules/message/interfaces/page.module';
import { CreateConversationUseCase } from 'src/modules/conversation/application/use-cases/create-conversation.usecase';
import { DeleteConversationUseCase } from 'src/modules/conversation/application/use-cases/delete-conversation.usecase';
import { SendMessageUseCase } from 'src/modules/conversation/application/use-cases/send-message.usecase';
import { UpdateMyParticipantUsernameUseCase } from 'src/modules/conversation/application/use-cases/update-my-participant-username.usecase';
import { UpdateConversationAvatarUseCase } from 'src/modules/conversation/application/use-cases/update-conversation-avatar.usecase';
import {
  GetConversationsByUserUseCase,
  GetConversationByIdUseCase,
  GetMessagesByPageUseCase,
  GetPageListUseCase,
} from 'src/modules/conversation/application/use-cases/get-conversation.usecase';
import { AddReactionUseCase } from 'src/modules/conversation/application/use-cases/add-reaction.usecase';
import { RemoveReactionUseCase } from 'src/modules/conversation/application/use-cases/remove-reaction.usecase';
import { FileModule } from 'src/modules/file/interfaces/file.module';
import { StickerModule } from 'src/modules/sticker/sticker.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConversationDocument.name, schema: ConversationSchema },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => FriendshipModule),
    PageModule,
    FileModule,
    StickerModule,
  ],
  controllers: [ConversationsController],
  providers: [
    { provide: IConversationRepository, useClass: ConversationRepository },
    CreateConversationUseCase,
    DeleteConversationUseCase,
    UpdateMyParticipantUsernameUseCase,
    UpdateConversationAvatarUseCase,
    SendMessageUseCase,
    GetConversationsByUserUseCase,
    GetConversationByIdUseCase,
    GetMessagesByPageUseCase,
    GetPageListUseCase,
    AddReactionUseCase,
    RemoveReactionUseCase,
  ],
  exports: [IConversationRepository, CreateConversationUseCase],
})
export class ConversationsModule {}
