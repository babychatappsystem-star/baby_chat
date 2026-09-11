import { AxiosError } from 'axios';
import type { ApiErrorResponse } from '../types/api.types';

// Trích thông điệp lỗi (server message) từ một lỗi axios bất kỳ.
// Truyền `codeMap` để map error code → message tùy biến (vd tiếng Việt).
export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Đã có lỗi xảy ra',
  codeMap?: Record<string, string>
): string => {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (codeMap && data?.error && codeMap[data.error]) return codeMap[data.error];
    if (data?.message) return data.message;
  }
  return fallback;
};
