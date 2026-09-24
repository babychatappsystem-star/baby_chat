import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IStickerRepository } from './domain/i-sticker.repository';
import { StickerPackSchema } from './infrastructure/sticker.schema';
import { StickerRepository } from './infrastructure/sticker.repository';
import { GetStickerPacksUseCase } from './application/use-cases/get-sticker-packs.usecase';
import { StickerController } from './interfaces/sticker.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'StickerPack', schema: StickerPackSchema },
    ]),
  ],
  controllers: [StickerController],
  providers: [
    {
      provide: IStickerRepository,
      useClass: StickerRepository,
    },
    GetStickerPacksUseCase,
  ],
  exports: [IStickerRepository],
})
export class StickerModule {}
