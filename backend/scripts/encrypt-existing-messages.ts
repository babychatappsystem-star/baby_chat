// Mã hoá content/replySnippet của các tin nhắn cũ còn lưu dạng plaintext.
// An toàn khi chạy lại và khi app đang chạy: mỗi field chỉ được ghi nếu trong DB vẫn
// còn đúng giá trị plaintext đã đọc (arrayFilters), không đè lên dữ liệu mới.
//
// Chạy thử (không ghi):  npx ts-node scripts/encrypt-existing-messages.ts
// Thực thi:              npx ts-node scripts/encrypt-existing-messages.ts --apply
// DB/khoá khác .env (PowerShell):
//   $env:MONGODB_URI="mongodb+srv://..."; $env:MESSAGE_ENCRYPTION_KEYS="k1:..."
//   npx ts-node scripts/encrypt-existing-messages.ts --apply
import mongoose from 'mongoose';
import { resolve } from 'path';
import * as dotenv from 'dotenv';
import { MessageCipher, messageAad } from '../src/shared/crypto/message-cipher';

dotenv.config({ path: resolve(__dirname, '../.env') });
const APPLY = process.argv.includes('--apply');
const FIELDS = ['content', 'replySnippet'] as const;

interface MessageRow {
  _id: mongoose.Types.ObjectId;
  content?: string;
  replySnippet?: string;
}

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/BabyChat';
  const cipher = MessageCipher.fromKeyList(process.env.MESSAGE_ENCRYPTION_KEYS);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');
  const pages = db.collection('pages');

  let scanned = 0;
  let plaintext = 0;
  let updated = 0;
  const cursor = pages.find(
    {},
    { projection: { 'messages._id': 1, 'messages.content': 1, 'messages.replySnippet': 1 } },
  );
  for await (const page of cursor) {
    scanned++;
    const ops: mongoose.mongo.AnyBulkWriteOperation[] = [];
    for (const m of (page.messages ?? []) as MessageRow[]) {
      for (const field of FIELDS) {
        const value = m[field];
        if (!value || MessageCipher.isEncrypted(value)) continue;
        plaintext++;
        ops.push({
          updateOne: {
            filter: { _id: page._id },
            update: {
              $set: {
                [`messages.$[m].${field}`]: cipher.encrypt(value, messageAad(m._id.toString(), field)),
              },
            },
            arrayFilters: [{ 'm._id': m._id, [`m.${field}`]: value }],
          },
        });
      }
    }
    if (APPLY && ops.length > 0) {
      const res = await pages.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount;
    }
  }

  console.log(`DB: ${db.databaseName}`);
  console.log(`Pages scanned: ${scanned}`);
  console.log(`Plaintext fields found: ${plaintext}`);
  if (APPLY) console.log(`Fields encrypted: ${updated}`);
  else console.log('Dry-run — thêm --apply để mã hoá.');

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
