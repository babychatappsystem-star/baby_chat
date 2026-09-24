import apiClient from '../api/apiClient';
import type { AuthResponse, ProfileDTO, VerifyRegistrationPayload } from '../types/api.types';

export interface LoginPayload {
  email: string;
  password: string;
}

const SESSION_KEYS = {
  userId:                   'userId',
  username:                 'username',
  email:                    'email',
  access_token:             'access_token',
  refresh_token:            'refresh_token',
  access_token_expires_at:  'access_token_expires_at',
  refresh_token_expires_at: 'refresh_token_expires_at',
} as const;

const persistSession = (data: AuthResponse): void => {
  localStorage.setItem(SESSION_KEYS.userId,                   data.user.id);
  localStorage.setItem(SESSION_KEYS.username,                 data.user.username);
  localStorage.setItem(SESSION_KEYS.email,                    data.user.email);
  localStorage.setItem(SESSION_KEYS.access_token,             data.access_token);
  localStorage.setItem(SESSION_KEYS.refresh_token,            data.refresh_token);
  localStorage.setItem(SESSION_KEYS.access_token_expires_at,  data.access_token_expires_at);
  localStorage.setItem(SESSION_KEYS.refresh_token_expires_at, data.refresh_token_expires_at);
};

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    persistSession(data);
    return data;
  },

  async sendVerificationLink(email: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/register', { email });
    return data;
  },

  async verifyRegistration(payload: VerifyRegistrationPayload): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/verify-registration', payload);
    persistSession(data);
    return data;
  },

  async getProfile(): Promise<ProfileDTO> {
    const { data } = await apiClient.get<ProfileDTO>('/auth/profile');
    return data;
  },

  async updateAvatar(fileId: string): Promise<ProfileDTO> {
    // Server trả { id, username, email, avatarUrl } — map "id" → "userId" để khớp ProfileDTO.
    const { data } = await apiClient.patch<{ id: string; username: string; email: string; avatarUrl?: string | null }>(
      '/users/me/avatar',
      { fileId }
    );
    return { userId: data.id, username: data.username, email: data.email, avatarUrl: data.avatarUrl };
  },

  logout(): void {
    Object.values(SESSION_KEYS).forEach((key) => localStorage.removeItem(key));
  },

  getAccessToken(): string | null {
    return localStorage.getItem(SESSION_KEYS.access_token);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(SESSION_KEYS.refresh_token);
  },

  // Returns true if access token is missing or expires within the next 30s
  isAccessTokenExpired(): boolean {
    const expiresAt = localStorage.getItem(SESSION_KEYS.access_token_expires_at);
    if (!expiresAt) return true;
    return Date.now() >= new Date(expiresAt).getTime() - 30_000;
  },

  isRefreshTokenExpired(): boolean {
    const expiresAt = localStorage.getItem(SESSION_KEYS.refresh_token_expires_at);
    if (!expiresAt) return true;
    return Date.now() >= new Date(expiresAt).getTime();
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !this.isRefreshTokenExpired();
  },
};