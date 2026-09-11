import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { TokenBlacklistService } from 'src/modules/auth/infrastructure/token-blacklist.service';
import { JwtPayload } from 'src/modules/auth/infrastructure/jwt.strategy';

export interface AuthenticatedSocketUser {
  userId: string;
  email: string;
  username?: string;
  roles?: string[];
}

// Shape mà middleware sẽ gán vào socket.data. Gateway dùng cast type khi đọc.
// Socket.IO type của data là Record<string, any> mặc định, nên không cần module augmentation.
export interface SocketDataShape {
  user?: AuthenticatedSocketUser;
  token?: string;
}

// Middleware Socket.IO: verify JWT từ handshake.auth.token. Reject connection nếu invalid.
// Reuse JwtService global (đã đăng ký trong AppModule) + TokenBlacklistService.
export function createWsJwtMiddleware(
  jwtService: JwtService,
  tokenBlacklist: TokenBlacklistService,
) {
  const logger = new Logger('WsJwtMiddleware');

  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      // Ưu tiên auth.token (Socket.IO chuẩn), fallback Authorization header cho client legacy.
      const rawToken =
        (socket.handshake.auth?.token as string | undefined) ??
        extractBearer(socket.handshake.headers?.authorization);

      if (!rawToken) {
        return next(new Error('Missing auth token'));
      }

      if (await tokenBlacklist.has(rawToken)) {
        return next(new Error('Token has been revoked'));
      }

      const payload = await jwtService.verifyAsync<JwtPayload>(rawToken);

      const data: SocketDataShape = {
        user: {
          userId: payload.sub,
          email: payload.email,
          username: payload.username,
          roles: payload.roles,
        },
        token: rawToken,
      };
      Object.assign(socket.data, data);
      next();
    } catch (err) {
      logger.warn(`Reject WS connection: ${(err as Error).message}`);
      next(new Error('Unauthorized'));
    }
  };
}

function extractBearer(header?: string): string | undefined {
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : undefined;
}
