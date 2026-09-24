import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IStickerRepository } from '../domain/i-sticker.repository';
import { StickerItem, StickerPack } from '../domain/sticker-pack.entity';
import { StickerPackDocument } from './sticker.schema';

@Injectable()
export class StickerRepository implements IStickerRepository {
  constructor(
    @InjectModel('StickerPack')
    private readonly stickerPackModel: Model<StickerPackDocument>,
  ) {}

  private toDomain(doc: StickerPackDocument): StickerPack {
    return new StickerPack({
      id: (doc._id as Types.ObjectId).toString(),
      name: doc.name,
      thumbnailUrl: doc.thumbnailUrl,
      isActive: doc.isActive,
      items: doc.items.map(
        (item) => new StickerItem(item._id.toString(), item.url),
      ),
    });
  }

  async getActivePacks(): Promise<StickerPack[]> {
    const docs = await this.stickerPackModel.find({ isActive: true }).exec();
    return docs.map(this.toDomain);
  }

  async findItemById(stickerId: string): Promise<StickerItem | null> {
    if (!Types.ObjectId.isValid(stickerId)) {
      return null;
    }

    const objectId = new Types.ObjectId(stickerId);
    // Find the pack that contains the item
    const doc = await this.stickerPackModel
      .findOne({ 'items._id': objectId })
      .exec();
    if (!doc) {
      return null;
    }

    // Find the specific item in the pack
    const itemSubdoc = doc.items.find(
      (item) => item._id.toString() === stickerId,
    );
    if (!itemSubdoc) {
      return null;
    }

    return new StickerItem(itemSubdoc._id.toString(), itemSubdoc.url);
  }
}
