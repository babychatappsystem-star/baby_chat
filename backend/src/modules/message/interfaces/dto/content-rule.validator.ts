import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { MESSAGE_CONTENT_MAX_LENGTH } from 'src/modules/message/domain/message.entity';

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
            return typeof value === 'string' && value.length <= MESSAGE_CONTENT_MAX_LENGTH;
          }
          // Text: bắt buộc string non-empty sau trim.
          return (
            typeof value === 'string' &&
            value.trim().length > 0 &&
            value.length <= MESSAGE_CONTENT_MAX_LENGTH
          );
        },
        defaultMessage(args: ValidationArguments): string {
          const type = (args.object as { type?: string }).type;
          return (type === 'image' || type === 'sticker')
            ? `content must be a string of at most ${MESSAGE_CONTENT_MAX_LENGTH} characters when provided`
            : `content is required and must be a non-empty string of at most ${MESSAGE_CONTENT_MAX_LENGTH} characters for text messages`;
        },
      },
    });
  };
}
