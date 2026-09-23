import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { UserModule } from 'src/modules/user/interfaces/users.module';
import { ConversationsModule } from 'src/modules/conversation/interfaces/conversations.module';

@Module({
  imports: [UserModule, ConversationsModule], // RealtimeModule is @Global, so no need to import it here explicitly for PresenceService
  controllers: [NotificationController],
  providers: [NotificationService],
})
export class NotificationModule {}
