import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ _id: true })
class MessageSubdoc {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  declare _id: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  declare senderId: mongoose.Types.ObjectId;

  // replyId là _id của subdoc trong cùng/khác page — không phải ref đến collection riêng.
  // Kèm theo snippet + senderId để render reply UI mà không cần lookup thêm.
  @Prop({ type: mongoose.Schema.Types.ObjectId, default: null })
  declare replyId?: mongoose.Types.ObjectId;

  @Prop({ required: false })
  declare replySnippet?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  declare replySenderId?: mongoose.Types.ObjectId;

  // content có thể rỗng nếu là image message (caption optional).
  @Prop({ required: false, default: '' })
  declare content: string;

  // Loại tin nhắn. Data cũ thiếu field → mapper default 'text'.
  @Prop({ required: false, enum: ['text', 'image'], default: 'text' })
  declare type?: string;

  // Tham chiếu file ảnh (collection 'files') khi type='image'.
  @Prop({ required: false })
  declare fileId?: string;

  @Prop({ default: Date.now })
  declare createdAt: Date;

  @Prop({ default: Date.now })
  declare updatedAt: Date;
}

@Schema({ timestamps: true, collection: 'pages' })
export class PageDocument extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true })
  declare conversationId: mongoose.Types.ObjectId;

  @Prop({ required: true, min: 1 })
  declare pageNumber: number;

  @Prop({ default: 50, min: 1, max: 100 })
  declare pageSize: number;

  @Prop({ default: 0, min: 0 })
  declare messageCount: number;

  @Prop({ default: Date.now })
  declare startTime: Date;

  @Prop()
  declare endTime?: Date;

  @Prop({ type: [MessageSubdoc], default: [] })
  declare messages: MessageSubdoc[];
}

export const PageSchema = SchemaFactory.createForClass(PageDocument);

PageSchema.index({ conversationId: 1, pageNumber: 1 }, { unique: true });
PageSchema.index({ conversationId: 1 });
// Cho phép query "tin nhắn của user X trong các page" + cascade khi user bị xóa.
PageSchema.index({ 'messages.senderId': 1 });
