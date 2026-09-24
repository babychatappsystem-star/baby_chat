import apiClient from '../api/apiClient';
import { authService, type LoginPayload } from '../services/authService';
import { unsubscribeFromPush } from '../shared/hooks/usePushNotifications';
import type { AuthResponse, VerifyRegistrationPayload } from '../types/api.types';
import { connectSocket, disconnectSocket } from './socket';

// Điểm vào duy nhất cho vòng đời phiên đăng nhập: mọi nơi login/logout phải đi qua
// đây để socket, token và push subscription luôn khớp với tài khoản hiện tại.

export function startRealtime(): void {
  const token = authService.getAccessToken();
  if (token) connectSocket(token);
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const data = await authService.login(payload);
  startRealtime();
  return data;
}

export async function verifyRegistration(payload: VerifyRegistrationPayload): Promise<AuthResponse> {
  const data = await authService.verifyRegistration(payload);
  startRealtime();
  return data;
}

// Best-effort: lỗi mạng ở bước push/revoke không được chặn việc đăng xuất cục bộ.
export async function logout(): Promise<void> {
  await unsubscribeFromPush().catch((err) => console.error('Failed to unsubscribe push', err));

  const refreshToken = authService.getRefreshToken();
  if (refreshToken) {
    await apiClient
      .post('/auth/logout', { refresh_token: refreshToken })
      .catch((err) => console.error('Failed to revoke tokens', err));
  }

  disconnectSocket();
  authService.logout();
}
