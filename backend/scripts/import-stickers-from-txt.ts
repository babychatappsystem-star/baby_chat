import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { resolve } from 'path';

// Load .env
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/babychat';

async function run() {
  try {
    const txtContent = fs.readFileSync(resolve(__dirname, '../stickers.txt'), 'utf-8');
    const lines = txtContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    const packs: any[] = [];
    let currentPack: any = null;

    for (const line of lines) {
      if (line.startsWith('[') && line.endsWith(']')) {
        // Tên bộ sticker mới
        const name = line.substring(1, line.length - 1);
        currentPack = {
          name: name,
          thumbnailUrl: '', // Sẽ dùng url đầu tiên làm thumbnail
          isActive: true,
          items: []
        };
        packs.push(currentPack);
      } else if (line.startsWith('http') && currentPack) {
        // Link sticker
        currentPack.items.push({ url: line });
        if (!currentPack.thumbnailUrl) {
          currentPack.thumbnailUrl = line;
        }
      }
    }

    if (packs.length === 0) {
      console.log('No valid sticker packs found in stickers.txt');
      return;
    }

    console.log(`Parsed ${packs.length} packs from stickers.txt:`);
    packs.forEach(p => console.log(`- ${p.name}: ${p.items.length} items`));

    console.log(`\nConnecting to ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database.');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('sticker_packs');
    
    // Tuỳ chọn xoá cũ:
    // await collection.deleteMany({});

    const result = await collection.insertMany(packs);
    console.log(`Seeded ${result.insertedCount} new sticker packs successfully!`);

  } catch (error) {
    console.error('Error importing stickers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

run();
