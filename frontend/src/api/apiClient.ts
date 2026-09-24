import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import environmentLoader from '../config/environmentLoader';
import type { AuthResponse } from '../types/api.types';

const env = environmentLoader.loadConfig();

const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 60000, // Tăng lên 60s để chờ Render backend "thức dậy" (Cold start)
  headers: { 'Content-Type': 'application/json' },
});

const persistTokens = (data: AuthResponse): void => {
  localStorage.setItem('access_token',             data.access_token);
  localStorage.setItem('refresh_token',            data.refresh_token);
  localStorage.setItem('access_token_expires_at',  data.access_token_expires_at);
  localStorage.setItem('refresh_token_expires_at', data.refresh_token_expires_at);
};

const clearSession = (): void => {
  ['access_token', 'refresh_token', 'access_token_expires_at',
   'refresh_token_expires_at', 'userId', 'username', 'email'].forEach((k) =>
    localStorage.removeItem(k)
  );
  window.location.href = '/login';
};

// Endpoint công khai — không cần access token và không refresh khi 401.
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];
const isPublicPath = (url?: string): boolean =>
  !!url && PUBLIC_PATHS.some((p) => url.includes(p));

// Single-flight: refresh token bị rotate sau mỗi lần dùng, nên mọi nơi (interceptor,
// socket) phải chờ chung 1 request — 2 request song song thì request sau luôn thất bại.
let refreshInFlight: Promise<string> | null = null;

export function refreshAccessToken(): Promise<string> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No refresh token');
      const { data } = await axios.post<AuthResponse>(`${env.apiUrl}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      persistTokens(data);
      return data.access_token;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

const refreshOrLogout = async (): Promise<string> => {
  try {
    return await refreshAccessToken();
  } catch (err) {
    clearSession();
    throw err;
  }
};

// --- Request interceptor: proactive refresh if token expires within 30s ---
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicPath(config.url)) return config;

    const expiresAt = localStorage.getItem('access_token_expires_at');
    const isExpiringSoon = expiresAt
      ? Date.now() >= new Date(expiresAt).getTime() - 30_000
      : false;

    const token = isExpiringSoon ? await refreshOrLogout() : localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// --- Response interceptor: reactive refresh on unexpected 401 ---
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (
      error.response?.status !== 401 ||
      original._retry ||
      isPublicPath(original.url)
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    const token = await refreshOrLogout();
    original.headers.Authorization = `Bearer ${token}`;
    return apiClient(original);
  }
);

export default apiClient;
