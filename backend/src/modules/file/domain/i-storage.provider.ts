// Abstraction storage backend. Đổi local disk → S3/Cloudinary chỉ cần implement lại
// interface này, business logic (use case) không đổi.
export abstract class IStorageProvider {
  // Lưu buffer với tên filename, trả về URL công khai để client truy cập.
  abstract save(buffer: Buffer, filename: string): Promise<{ url: string }>;
  // Xóa file vật lý theo filename. Idempotent — không throw nếu file đã không tồn tại.
  abstract delete(filename: string): Promise<void>;
}

export const STORAGE_PROVIDER = IStorageProvider;
