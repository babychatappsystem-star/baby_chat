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
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// --- Token refresh state ---
let isRefreshing = false;
type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };
let queue: QueueItem[] = [];

const flushQueue = (token: string | null, error: unknown = null): void => {
  queue.forEach((item) => (token ? item.resolve(token) : item.reject(error)));
  queue = [];
};

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

const doRefresh = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) throw new Error('No refresh token');

  const { data } = await axios.post<AuthResponse>(
    `${env.apiUrl}/auth/refresh`,
    { refresh_token: refreshToken }
  );

  persistTokens(data);
  apiClient.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
  return data.access_token;
};

// --- Request interceptor: proactive refresh if token expires within 30s ---
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (isPublicPath(config.url)) {
      return config;
    }

    const expiresAt = localStorage.getItem('access_token_expires_at');
    const isExpiringSoon = expiresAt
      ? Date.now() >= new Date(expiresAt).getTime() - 30_000
      : false;

    if (isExpiringSoon) {
      if (isRefreshing) {
        // Wait for the in-flight refresh to complete
        const token = await new Promise<string>((resolve, reject) => {
          queue.push({ resolve, reject });
        });
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      }

      isRefreshing = true;
      try {
        const token = await doRefresh();
        flushQueue(token);
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        flushQueue(null, err);
        clearSession();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
      return config;
    }

    const token = localStorage.getItem('access_token');
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

    if (isRefreshing) {
      return new Promise<AxiosResponse>((resolve, reject) => {
        queue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const token = await doRefresh();
      flushQueue(token);
      original.headers.Authorization = `Bearer ${token}`;
      return apiClient(original);
    } catch (refreshError) {
      flushQueue(null, refreshError);
      clearSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;