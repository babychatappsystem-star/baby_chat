import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class VerificationToken extends Document {
  @Prop({ required: true })
  email: string;

  @Prop({ required: true, unique: true })
  token: string;

  // TTL index: Tự động xóa document sau 15 phút
  @Prop({ type: Date, expires: '15m', default: Date.now })
  createdAt: Date;
}

export const VerificationTokenSchema = SchemaFactory.createForClass(VerificationToken);
