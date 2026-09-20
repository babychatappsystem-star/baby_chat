import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/babychat';

async function fixStickers() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB connection failed');
    
    const collection = db.collection('sticker_packs');
    const packs = await collection.find({}).toArray();

    let updatedCount = 0;
    for (const pack of packs) {
      let changed = false;
      if (Array.isArray(pack.items)) {
        for (const item of pack.items) {
          if (!item._id) {
            item._id = new mongoose.Types.ObjectId();
            changed = true;
          }
        }
      }
      if (changed) {
        await collection.updateOne({ _id: pack._id }, { $set: { items: pack.items } });
        updatedCount++;
      }
    }

    console.log(`Fixed ${updatedCount} sticker packs (added _id to items).`);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
}

fixStickers();
