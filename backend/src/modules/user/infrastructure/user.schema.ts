import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true, collection: 'users' })
export class UserDocument extends Document {
  @Prop({ required: true })
  declare username: string;

  @Prop({ required: true })
  declare email: string;

  @Prop({ required: true })
  declare password: string;

  @Prop({ required: false })
  declare displayName?: string;

  @Prop({ required: false })
  declare dateOfBirth?: Date;

  @Prop({ default: Date.now })
  declare createdAt: Date;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }],
    default: [],
  })
  declare listChats: mongoose.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' }],
    default: [],
  })
  declare listGroups: mongoose.Types.ObjectId[];

  // Mã ngẫu nhiên dùng cho flow "thêm bạn bằng code". Lazy-init khi user gọi
  // GET /users/me/friend-code lần đầu. User cũ có thể có giá trị undefined.
  @Prop({ required: false })
  declare friendCode?: string;

  // Tham chiếu tới file ảnh avatar (collection 'files'). Resolve → url qua FileUrlResolver.
  @Prop({ required: false })
  declare avatarFileId?: string;

  // Thời gian user ngắt kết nối lần cuối. Ghi khi connectionCount về 0.
  @Prop({ required: false })
  declare lastSeenAt?: Date;

  // Ẩn trạng thái hoạt động. Khi true, luôn hiện offline với người khác.
  @Prop({ default: false })
  declare hidePresence: boolean;

  // Cấu hình Expressive Chat
  @Prop({ required: false, default: 5 })
  declare expressiveChatThresholds: number;

  @Prop({ required: false, default: 300 })
  declare expressiveChatTransitionTime: number;

  @Prop({ type: [String], default: ['🙂', '😀', '😄', '😆', '😂'] })
  declare expressiveChatEmojis: string[];

  // Web Push Subscriptions
  @Prop({
    type: [
      {
        endpoint: { type: String, required: true },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
      },
    ],
    default: [],
  })
  declare pushSubscriptions: Array<{
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }>;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 });
// sparse: cho phép nhiều document có friendCode = null/undefined cùng tồn tại.
UserSchema.index({ friendCode: 1 }, { unique: true, sparse: true });
