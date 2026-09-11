import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const MONGO_ID = /^[0-9a-fA-F]{24}$/;

// Ràng buộc fileId theo message type (fix lỗ hổng #1):
// - type === 'image' → fileId BẮT BUỘC và phải là Mongo ObjectId hợp lệ.
// - type !== 'image' → fileId phải RỖNG (undefined/null) — chặn combo text+fileId.
//
// Dùng 1 custom validator thay vì 2 @ValidateIf chồng nhau (class-validator chỉ
// giữ điều kiện @ValidateIf cuối cùng cho mỗi property → logic 2 nhánh bị hỏng).
export function IsFileIdAllowedForType(opts?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFileIdAllowedForType',
      target: object.constructor,
      propertyName,
      options: opts,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const type = (args.object as { type?: string }).type;
          if (type === 'image') {
            return typeof value === 'string' && MONGO_ID.test(value);
          }
          return value === undefined || value === null;
        },
        defaultMessage(args: ValidationArguments): string {
          const type = (args.object as { type?: string }).type;
          return type === 'image'
            ? 'fileId is required and must be a valid id for image messages'
            : "fileId is only allowed for image messages (type='image')";
        },
      },
    });
  };
}
