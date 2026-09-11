import { ObjectId } from 'bson';

// Sinh Mongo-compatible ObjectId hex string. Dùng cho entity cần id trước khi insert
// (vd: sinh _id của message subdoc client-side để biết chính xác id đã push).
export function generateObjectIdHex(): string {
  return new ObjectId().toHexString();
}
