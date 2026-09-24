import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './modules/user/interfaces/users.module';
import { ConversationsModule } from './modules/conversation/interfaces/conversations.module';
import { AuthModule } from './modules/auth/interfaces/auth.module';
import { PageModule } from './modules/message/interfaces/page.module';
import { FriendshipModule } from './modules/friendship/interfaces/friendship.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { FileModule } from './modules/file/interfaces/file.module';
import { StickerModule } from './modules/sticker/sticker.module';
import { EventsModule } from './shared/events/events.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES');
        if (!secret) throw new Error('JWT_SECRET is not defined');
        if (!expiresIn)
          throw new Error('JWT_ACCESS_TOKEN_EXPIRES is not defined');
        return { secret, signOptions: { expiresIn }, global: true };
      },
      inject: [ConfigService],
      global: true,
    }),
    EventEmitterModule.forRoot(),
    // Mặc định cho route có ThrottlerGuard; route nhạy cảm override bằng @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    EventsModule,
    FileModule,
    UserModule,
    ConversationsModule,
    AuthModule,
    PageModule,
    FriendshipModule,
    RealtimeModule,
    StickerModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
