import { Global, Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/interfaces/auth.module';
import { ConversationsModule } from 'src/modules/conversation/interfaces/conversations.module';
import { UserModule } from 'src/modules/user/interfaces/users.module';
import { PageModule } from 'src/modules/message/interfaces/page.module';
import { FileModule } from 'src/modules/file/interfaces/file.module';
import { FriendshipModule } from 'src/modules/friendship/interfaces/friendship.module';
import { ChatGateway } from './gateway/chat.gateway';
import { DomainEventsBridge } from './bridge/domain-events.bridge';
import { PresenceService } from './presence/presence.service';

// @Global để các module khác (nếu cần emit thủ công) có thể inject ChatGateway
// mà không phải import RealtimeModule.
@Global()
@Module({
  imports: [AuthModule, ConversationsModule, UserModule, PageModule, FileModule, FriendshipModule],
  providers: [ChatGateway, DomainEventsBridge, PresenceService],
  exports: [ChatGateway, PresenceService],
})
export class RealtimeModule {}
