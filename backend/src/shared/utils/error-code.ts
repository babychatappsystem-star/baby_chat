// Đọc `code` của lỗi từ thư viện (Mongo 11000, fs ENOENT...) mà không cần `any`.
export function errorCode(err: unknown): unknown {
  return typeof err === 'object' && err !== null && 'code' in err
    ? (err as { code: unknown }).code
    : undefined;
}
