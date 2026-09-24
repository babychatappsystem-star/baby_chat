import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'blacklisted_tokens',
})
export class BlacklistedTokenDocument extends Document {
  @Prop({ required: true, unique: true })
  declare token: string;

  @Prop({ required: true })
  declare expiresAt: Date;

  @Prop({ default: Date.now })
  declare createdAt: Date;
}

export const BlacklistedTokenSchema = SchemaFactory.createForClass(
  BlacklistedTokenDocument,
);

// MongoDB will automatically delete documents when expiresAt is reached.
BlacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
