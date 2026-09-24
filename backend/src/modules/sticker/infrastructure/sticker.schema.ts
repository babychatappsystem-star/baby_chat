import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ _id: true, timestamps: false })
export class StickerItemSubdoc {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true })
  url: string;
}
export const StickerItemSchema =
  SchemaFactory.createForClass(StickerItemSubdoc);

@Schema({ collection: 'sticker_packs', timestamps: true })
export class StickerPackDocument extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  thumbnailUrl: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ type: [StickerItemSchema], default: [] })
  items: StickerItemSubdoc[];
}
export const StickerPackSchema =
  SchemaFactory.createForClass(StickerPackDocument);
