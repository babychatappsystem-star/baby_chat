import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PageDocument,
  PageSchema,
} from 'src/modules/message/infrastructure/page.schema';
import { PageRepository } from 'src/modules/message/infrastructure/page.repository';
import { IPageRepository } from 'src/modules/message/domain/i-page.repository';
import { MessageCipher } from 'src/shared/crypto/message-cipher';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PageDocument.name, schema: PageSchema },
    ]),
  ],
  controllers: [],
  providers: [
    // Thiếu/sai MESSAGE_ENCRYPTION_KEYS → factory throw → app không khởi động (không bao giờ lưu plaintext).
    {
      provide: MessageCipher,
      useFactory: (config: ConfigService) =>
        MessageCipher.fromKeyList(
          config.get<string>('MESSAGE_ENCRYPTION_KEYS'),
        ),
      inject: [ConfigService],
    },
    { provide: IPageRepository, useClass: PageRepository },
  ],
  exports: [IPageRepository],
})
export class PageModule {}
