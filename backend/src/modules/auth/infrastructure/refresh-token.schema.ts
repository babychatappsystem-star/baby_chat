import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import mongoose from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'refresh_tokens',
})
export class RefreshTokenDocument extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  declare userId: mongoose.Types.ObjectId;

  // SHA-256 hex của plaintext refresh token (server không lưu plaintext).
  @Prop({ required: true })
  declare tokenHash: string;

  @Prop({ required: true })
  declare expiresAt: Date;

  @Prop({ required: false })
  declare revokedAt?: Date;

  @Prop({ default: Date.now })
  declare createdAt: Date;
}

export const RefreshTokenSchema =
  SchemaFactory.createForClass(RefreshTokenDocument);

// Query khi refresh: theo (userId, tokenHash). Hash đủ random nên unique.
RefreshTokenSchema.index({ userId: 1, tokenHash: 1 }, { unique: true });
// TTL: Mongo tự xóa document khi expiresAt qua.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
