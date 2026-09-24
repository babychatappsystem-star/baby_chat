// Vi phạm quy tắc nghiệp vụ do dữ liệu/yêu cầu của client (không phải lỗi hệ thống).
// Domain layer không phụ thuộc NestJS nên dùng Error thuần; GlobalExceptionFilter map → 400.
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
