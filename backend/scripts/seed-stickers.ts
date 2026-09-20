import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env từ thư mục backend
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/babychat';

const stickerPacks = [
  {
    name: 'Qoobee Agapi',
    thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg', // Thay bằng link thumbnail thật
    isActive: true,
    items: [
      {
        url: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcDhxbnh3NnJxb3c0emR6NDF1ZmNpbnYwZnp6cmc1ZTVndTRyZG05bSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/1gdkHhA0zE6B6zQn6j/giphy.gif', // Qoobee hi
      },
      {
        url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjhtODcxbDlsMTlycnUyeWZvNWN5cWNxeDN1NmoyOGh0YnRwMDhkcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/43LzRzV1sPz285fS05/giphy.gif', // Qoobee love
      },
      {
        url: 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdWJ2em05NDYycjEzMnZobXo1OHVndmZ6cnh4OHlyYnM1dTRlZmV6byZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/5QMT3L1KkF3oJMBH6f/giphy.gif', // Qoobee cry
      },
      {
        url: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJtdGJtcTVnN3d6bzR5a3B4YWxpdTRubmlxbDhmMnpnbzhycTN0ZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/58FDuiRsLPfmpd1U6X/giphy.gif', // Qoobee sad
      },
    ]
  },
  {
    name: 'Pepe The Frog',
    thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
    isActive: true,
    items: [
      { url: 'https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExemRqbWl5bWoxeXlndmZ3dHRvbmkxaGRrOHUyaXVscXVxcXQ5dHRxbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/3o7aD2saalBwwftBIY/giphy.gif' },
      { url: 'https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExcGFxOHZ2bXZybDlyMWUycnEyMnF6cXVxdTVuNG10OWVzZHJtcmhwciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9cw/101DNxoRVnb9IGROnd/giphy.gif' },
    ]
  }
];

async function seed() {
  try {
    console.log(`Connecting to ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database.');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const collection = db.collection('sticker_packs');

    // Xoá các pack cũ nếu muốn (tuỳ chọn)
    // await collection.deleteMany({});
    // console.log('Cleared existing sticker packs.');

    const result = await collection.insertMany(stickerPacks);
    console.log(`Seeded ${result.insertedCount} sticker packs successfully!`);
    
  } catch (error) {
    console.error('Error seeding stickers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from database.');
  }
}

seed();
