import { HttpException, HttpStatus } from '@nestjs/common';

// ─── User exceptions ──────────────────────────────────────────────────────────

export class UserNotFoundException extends HttpException {
  constructor(identifier?: string) {
    const message = identifier ? `User '${identifier}' not found` : 'User not found';
    super({ error: 'UserNotFound', message, statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
  }
}

export class UserAccessDeniedException extends HttpException {
  constructor() {
    super(
      {
        error: 'UserAccessDenied',
        message: 'You do not have permission to perform this action on this user',
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class UserAlreadyExistsException extends HttpException {
  constructor(email: string) {
    super(
      { error: 'UserAlreadyExists', message: `User with email '${email}' already exists`, statusCode: HttpStatus.CONFLICT },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super(
      { error: 'InvalidCredentials', message: 'Email or password is incorrect', statusCode: HttpStatus.UNAUTHORIZED },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class InvalidRefreshTokenException extends HttpException {
  constructor() {
    super(
      { error: 'InvalidRefreshToken', message: 'Refresh token is invalid, expired, or revoked', statusCode: HttpStatus.UNAUTHORIZED },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

// ─── Conversation exceptions ──────────────────────────────────────────────────

export class ConversationNotFoundException extends HttpException {
  constructor(id?: string) {
    const message = id ? `Conversation '${id}' not found` : 'Conversation not found';
    super({ error: 'ConversationNotFound', message, statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
  }
}

export class NotParticipantException extends HttpException {
  constructor(userId: string) {
    super(
      { error: 'NotParticipant', message: `User '${userId}' is not a participant of this conversation`, statusCode: HttpStatus.FORBIDDEN },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class AlreadyParticipantException extends HttpException {
  constructor(userId: string) {
    super(
      { error: 'AlreadyParticipant', message: `User '${userId}' is already a participant`, statusCode: HttpStatus.CONFLICT },
      HttpStatus.CONFLICT,
    );
  }
}

export class NotConversationAdminException extends HttpException {
  constructor(userId: string) {
    super(
      {
        error: 'NotConversationAdmin',
        message: `User '${userId}' does not have admin permission for this conversation`,
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvalidConversationTypeException extends HttpException {
  constructor(type: string) {
    super(
      { error: 'InvalidConversationType', message: `Conversation type '${type}' is not valid`, statusCode: HttpStatus.BAD_REQUEST },
      HttpStatus.BAD_REQUEST,
    );
  }
}

// ─── Page / Message exceptions ────────────────────────────────────────────────

export class PageNotFoundException extends HttpException {
  constructor(id?: string) {
    const message = id ? `Page '${id}' not found` : 'Page not found';
    super({ error: 'PageNotFound', message, statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
  }
}

export class PageFullException extends HttpException {
  constructor(pageId: string) {
    super(
      { error: 'PageFull', message: `Page '${pageId}' is full and cannot accept new messages`, statusCode: HttpStatus.CONFLICT },
      HttpStatus.CONFLICT,
    );
  }
}

export class EmptyMessageException extends HttpException {
  constructor() {
    super(
      { error: 'EmptyMessage', message: 'Message content cannot be empty', statusCode: HttpStatus.BAD_REQUEST },
      HttpStatus.BAD_REQUEST,
    );
  }
}

// ─── Friendship exceptions ────────────────────────────────────────────────────

export class FriendshipNotFoundException extends HttpException {
  constructor(id?: string) {
    const message = id ? `Friendship '${id}' not found` : 'Friendship not found';
    super({ error: 'FriendshipNotFound', message, statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
  }
}

export class FriendshipAlreadyExistsException extends HttpException {
  constructor() {
    super(
      {
        error: 'FriendshipAlreadyExists',
        message: 'A friendship or pending request already exists between these users',
        statusCode: HttpStatus.CONFLICT,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class CannotFriendSelfException extends HttpException {
  constructor() {
    super(
      { error: 'CannotFriendSelf', message: 'You cannot friend or block yourself', statusCode: HttpStatus.BAD_REQUEST },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class FriendshipBlockedException extends HttpException {
  constructor() {
    super(
      {
        error: 'FriendshipBlocked',
        message: 'Cannot perform this action because one user has blocked the other',
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class NotFriendshipRecipientException extends HttpException {
  constructor() {
    super(
      {
        error: 'NotFriendshipRecipient',
        message: 'Only the recipient of a friend request can perform this action',
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

// ─── File exceptions ──────────────────────────────────────────────────────────

export class InvalidFileTypeException extends HttpException {
  constructor() {
    super(
      {
        error: 'InvalidFileType',
        message: 'Only image files (jpeg, png, webp, gif) are allowed',
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class FileTooLargeException extends HttpException {
  constructor(maxSizeMb: number) {
    super(
      {
        error: 'FileTooLarge',
        message: `File exceeds the maximum allowed size of ${maxSizeMb}MB`,
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      },
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}

export class FileNotFoundException extends HttpException {
  constructor(id?: string) {
    const message = id ? `File '${id}' not found` : 'File not found';
    super({ error: 'FileNotFound', message, statusCode: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
  }
}

export class FileAccessDeniedException extends HttpException {
  constructor() {
    super(
      {
        error: 'FileAccessDenied',
        message: 'You do not have permission to perform this action on this file',
        statusCode: HttpStatus.FORBIDDEN,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class MissingFileException extends HttpException {
  constructor() {
    super(
      { error: 'MissingFile', message: 'No file was provided in the request', statusCode: HttpStatus.BAD_REQUEST },
      HttpStatus.BAD_REQUEST,
    );
  }
}

// Chặn combo vô nghĩa: chỉ image message mới được đính fileId.
export class FileNotAllowedForMessageTypeException extends HttpException {
  constructor() {
    super(
      {
        error: 'FileNotAllowedForMessageType',
        message: "fileId is only allowed for image messages (type='image')",
        statusCode: HttpStatus.BAD_REQUEST,
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
