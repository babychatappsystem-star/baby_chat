import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { getAllowedOrigins } from './cors';

// Áp CORS cho Socket.IO lúc tạo server (sau khi .env đã nạp) — decorator
// @WebSocketGateway chạy lúc import nên không đọc được cấu hình.
export class CorsIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: getAllowedOrigins(), credentials: true },
    });
  }
}
