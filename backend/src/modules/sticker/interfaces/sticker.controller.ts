import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/interfaces/guards/jwt-auth.guard';
import { GetStickerPacksUseCase } from '../application/use-cases/get-sticker-packs.usecase';
import { StickerPackDto } from './dto/sticker-pack.dto';

@Controller('stickers')
@UseGuards(JwtAuthGuard)
export class StickerController {
  constructor(
    private readonly getStickerPacksUseCase: GetStickerPacksUseCase,
  ) {}

  @Get('packs')
  async getPacks(): Promise<StickerPackDto[]> {
    const packs = await this.getStickerPacksUseCase.execute();
    return packs.map((pack) => ({
      id: pack.id,
      name: pack.name,
      thumbnailUrl: pack.thumbnailUrl,
      items: pack.items.map((item) => ({
        id: item.id,
        url: item.url,
      })),
    }));
  }
}
