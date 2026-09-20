import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidMessageException extends HttpException {
  constructor(message: string) {
    super(
      { error: 'InvalidMessage', message, statusCode: HttpStatus.BAD_REQUEST },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class StickerNotFoundException extends HttpException {
  constructor(id?: string) {
    const message = id ? `Sticker '${id}' not found` : 'Sticker not found';
    super({ error: 'StickerNotFound', message, statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
  }
}

export class StickerNotAllowedForMessageTypeException extends HttpException {
  constructor() {
    super(
      {
        error: 'StickerNotAllowedForMessageType',
        message: "stickerId is only allowed for sticker messages (type='sticker')",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
