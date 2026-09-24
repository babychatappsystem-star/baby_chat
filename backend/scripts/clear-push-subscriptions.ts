// Xoá toàn bộ pushSubscriptions của mọi user. Dữ liệu cũ không đáng tin vì bug
// NotificationController dùng req.user.sub (undefined) → mọi subscription bị gắn vào
// user đầu tiên. Client sẽ tự gửi lại subscription khi mở app.
//
// Chạy thử (không ghi):  npx ts-node scripts/clear-push-subscriptions.ts
// Thực thi:              npx ts-node scripts/clear-push-subscriptions.ts --apply
// DB khác local:         MONGODB_URI="mongodb+srv://..." npx ts-node scripts/clear-push-subscriptions.ts --apply
import mongoose from 'mongoose';
import { resolve } from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: resolve(__dirname, '../.env') });
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/BabyChat';
const APPLY = process.argv.includes('--apply');

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');

  const users = db.collection('users');
  const filter = { 'pushSubscriptions.0': { $exists: true } };

  const affected = await users
    .find(filter, { projection: { _id: 1, pushSubscriptions: 1 } })
    .toArray();
  const total = affected.reduce((n, u) => n + (u.pushSubscriptions?.length ?? 0), 0);
  console.log(`DB: ${db.databaseName}`);
  console.log(`Users có subscription: ${affected.length}, tổng subscription: ${total}`);
  for (const u of affected) console.log(`  ${u._id.toString()}: ${u.pushSubscriptions.length}`);

  if (!APPLY) {
    console.log('Dry-run — thêm --apply để xoá.');
  } else {
    const res = await users.updateMany(filter, { $set: { pushSubscriptions: [] } });
    console.log(`Đã xoá subscription của ${res.modifiedCount} user.`);
  }

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
