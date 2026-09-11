import { io, Socket } from 'socket.io-client';
import environmentLoader from '../config/environmentLoader';
import { authService } from '../services/authService';
import type { ServerToClientEvents, ClientToServerEvents } from './wsEvents';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

// Kết nối socket (singleton). Tự refresh access token khi connect_error do token.
// Idempotent: nếu socket đã tồn tại (đang connect hoặc đã connect) thì tái sử dụng,
// tránh đóng kết nối giữa handshake (gây lỗi "closed before established",
// đặc biệt khi StrictMode chạy effect 2 lần).
export function connectSocket(accessToken: string): AppSocket {
  if (socket) {
    socket.auth = { token: accessToken };
    if (!socket.connected) socket.connect();
    return socket;
  }

  const { apiUrl } = environmentLoader.loadConfig();

  socket = io(apiUrl, {
    auth: { token: accessToken },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect_error', async (err: Error) => {
    const needsRefresh =
      err.message === 'Token has been revoked' || err.message === 'Unauthorized';
    if (!needsRefresh) return;

    const newToken = await authService.refreshAccessToken();
    if (!newToken) {
      socket?.disconnect();
      window.location.href = '/login';
      return;
    }

    if (socket) {
      socket.auth = { token: newToken };
      socket.connect();
    }
  });

  return socket;
}

export function getSocket(): AppSocket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
