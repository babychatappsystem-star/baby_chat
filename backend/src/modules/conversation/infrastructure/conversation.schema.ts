import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ _id: false })
class ParticipantSubdoc {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  declare userId: mongoose.Types.ObjectId;

  // Snapshot username từ User lúc join, sau đó user có thể tự đổi nickname trong
  // conversation này mà không ảnh hưởng User.username gốc.
  @Prop({ required: true })
  declare username: string;

  @Prop({ required: true, enum: ['admin', 'member', 'moderator'] })
  declare role: string;

  @Prop({ default: Date.now })
  declare joinedAt: Date;

  @Prop()
  declare leftAt?: Date;

  @Prop({ default: false })
  declare isActive: boolean;
}

@Schema({ _id: false })
class ConvSettingSubdoc {
  @Prop({ default: false })
  declare isPrivate: boolean;

  @Prop({ default: true })
  declare allowInvites: boolean;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  declare mutedBy: mongoose.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  declare pinnedBy: mongoose.Types.ObjectId[];
}

@Schema({ timestamps: true, collection: 'conversations' })
export class ConversationDocument extends Document {
  @Prop({ required: true, enum: ['direct', 'group', 'channel'] })
  declare type: string;

  @Prop({ required: false })
  declare name?: string;

  @Prop({ required: false })
  declare description?: string;

  @Prop({ required: false })
  declare avatar?: string;

  // Tham chiếu file ảnh avatar (collection 'files'). Ưu tiên hơn `avatar` URL string.
  @Prop({ required: false })
  declare avatarFileId?: string;

  @Prop({ type: [ParticipantSubdoc], required: true, default: [] })
  declare participants: ParticipantSubdoc[];

  @Prop({ type: ConvSettingSubdoc, required: false })
  declare settings?: ConvSettingSubdoc;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  declare createdBy: mongoose.Types.ObjectId;

  // Soft delete: khi conversation bị xóa, set deletedAt thay vì hard delete.
  // Query mặc định filter { deletedAt: null } để ẩn khỏi list (xem repository).
  @Prop({ type: Date, required: false, default: null })
  declare deletedAt?: Date | null;

  // Do `timestamps: true` sinh ra — chỉ khai báo kiểu.
  declare createdAt: Date;
  declare updatedAt: Date;
}

export const ConversationSchema =
  SchemaFactory.createForClass(ConversationDocument);

ConversationSchema.path('participants').validate(
  (value: ParticipantSubdoc[]) => value && value.length > 0,
  'participants array must contain at least one element',
);

ConversationSchema.index({ 'participants.userId': 1 });
ConversationSchema.index({ createdBy: 1 });
ConversationSchema.index({ type: 1 });
