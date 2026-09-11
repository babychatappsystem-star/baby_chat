import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true, collection: 'files' })
export class FileDocument extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  declare ownerId: mongoose.Types.ObjectId;

  @Prop({
    required: true,
    enum: ['user_avatar', 'conversation_avatar', 'message_image', 'other'],
  })
  declare category: string;

  @Prop({ required: true })
  declare originalName: string;

  @Prop({ required: true })
  declare mimetype: string;

  @Prop({ required: true })
  declare size: number;

  // Tên file trên storage (uuid.webp). Dùng để xóa file vật lý.
  @Prop({ required: true })
  declare filename: string;

  @Prop({ required: true })
  declare url: string;

  @Prop({ required: false })
  declare thumbnailUrl?: string;

  @Prop({ required: true })
  declare width: number;

  @Prop({ required: true })
  declare height: number;

  @Prop({ default: Date.now })
  declare createdAt: Date;
}

export const FileSchema = SchemaFactory.createForClass(FileDocument);

FileSchema.index({ ownerId: 1 });
FileSchema.index({ category: 1 });
