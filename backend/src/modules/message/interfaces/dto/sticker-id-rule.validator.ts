import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const MONGO_ID = /^[0-9a-fA-F]{24}$/;

// Ràng buộc stickerId theo message type:
// - type === 'sticker' → stickerId BẮT BUỘC và phải là Mongo ObjectId hợp lệ.
// - type !== 'sticker' → stickerId phải RỖNG (undefined/null).
export function IsStickerIdAllowedForType(opts?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStickerIdAllowedForType',
      target: object.constructor,
      propertyName,
      options: opts,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const type = (args.object as { type?: string }).type;
          if (type === 'sticker') {
            return typeof value === 'string' && MONGO_ID.test(value);
          }
          return value === undefined || value === null;
        },
        defaultMessage(args: ValidationArguments): string {
          const type = (args.object as { type?: string }).type;
          return type === 'sticker'
            ? 'stickerId is required and must be a valid id for sticker messages'
            : "stickerId is only allowed for sticker messages (type='sticker')";
        },
      },
    });
  };
}
