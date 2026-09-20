import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// Ràng buộc content theo message type (fix lỗ hổng #2 — content non-string gây 500):
// - type === 'image' hoặc 'sticker' → content OPTIONAL; nếu có mặt phải là string. Thiếu/null OK (caption optional).
// - type === 'text' → content BẮT BUỘC là string non-empty (sau trim).
//
// Dùng 1 custom validator thay vì @ValidateIf + @IsOptional + @IsString chồng nhau
// (class-validator chỉ giữ điều kiện @ValidateIf cuối cùng cho mỗi property → logic 2 nhánh bị hỏng).
export function IsContentValidForType(opts?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isContentValidForType',
      target: object.constructor,
      propertyName,
      options: opts,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const type = (args.object as { type?: string }).type;
          if (type === 'image' || type === 'sticker') {
            // Optional: thiếu content OK. Nếu có mặt phải là string.
            if (value === undefined || value === null) return true;
            return typeof value === 'string';
          }
          // Text: bắt buộc string non-empty sau trim.
          return typeof value === 'string' && value.trim().length > 0;
        },
        defaultMessage(args: ValidationArguments): string {
          const type = (args.object as { type?: string }).type;
          return (type === 'image' || type === 'sticker')
            ? 'content must be a string when provided'
            : 'content is required and must be a non-empty string for text messages';
        },
      },
    });
  };
}
