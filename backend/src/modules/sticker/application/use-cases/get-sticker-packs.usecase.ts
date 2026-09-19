import { Inject, Injectable } from '@nestjs/common';
import { IStickerRepository } from '../../domain/i-sticker.repository';
import { StickerPack } from '../../domain/sticker-pack.entity';

@Injectable()
export class GetStickerPacksUseCase {
  constructor(
    @Inject(IStickerRepository)
    private readonly stickerRepository: IStickerRepository,
  ) {}

  async execute(): Promise<StickerPack[]> {
    return this.stickerRepository.getActivePacks();
  }
}
