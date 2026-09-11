import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import mongoose from 'mongoose';

@Schema({ timestamps: true, collection: 'friendships' })
export class FriendshipDocument extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  declare requesterId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  declare recipientId: mongoose.Types.ObjectId;

  @Prop({ required: true, enum: ['pending', 'accepted', 'blocked'] })
  declare status: string;

  @Prop({ required: false })
  declare acceptedAt?: Date;

  @Prop({ default: Date.now })
  declare createdAt: Date;

  @Prop({ default: Date.now })
  declare updatedAt: Date;
}

export const FriendshipSchema = SchemaFactory.createForClass(FriendshipDocument);

// Một chiều giữa 2 user là duy nhất; chiều ngược lại được phép tồn tại độc lập (vd: block).
FriendshipSchema.index({ requesterId: 1, recipientId: 1 }, { unique: true });
FriendshipSchema.index({ recipientId: 1, status: 1 });
FriendshipSchema.index({ requesterId: 1, status: 1 });
