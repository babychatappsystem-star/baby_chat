import mongoose from 'mongoose';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(__dirname, '.env') });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/BabyChat';

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) return;
  const collection = db.collection('pages');
  const res = await collection.updateMany({}, { $pull: { messages: { type: 'sticker', stickerUrl: { $exists: false } } } } as any);
  console.log(res);
  await mongoose.disconnect();
}
run();
