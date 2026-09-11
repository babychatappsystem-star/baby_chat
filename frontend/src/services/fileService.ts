import apiClient from '../api/apiClient';
import { getApiErrorMessage } from '../utils/apiError';
import type { FileCategory, FileUploadResponse } from '../types/api.types';

const ERROR_MESSAGES: Record<string, string> = {
  InvalidFileType: 'Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF',
  MissingFile:     'Vui lòng chọn một ảnh',
  FileTooLarge:    'Ảnh không được vượt quá 5MB',
  FileNotFound:    'File không tồn tại',
  FileAccessDenied: 'Bạn không có quyền với file này',
};

export const getFileErrorMessage = (error: unknown, fallback = 'Đã có lỗi xảy ra'): string =>
  getApiErrorMessage(error, fallback, ERROR_MESSAGES);

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Validate phía client trước khi upload — server vẫn validate lại.
export const validateImageFile = (file: File): string | null => {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Chỉ chấp nhận ảnh JPG, PNG, WEBP, GIF';
  if (file.size > MAX_SIZE) return 'Ảnh không được vượt quá 5MB';
  return null;
};

export const fileService = {
  async uploadImage(file: File, category: FileCategory): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await apiClient.post<FileUploadResponse>('/files', formData, {
      params: { category },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async deleteFile(id: string): Promise<void> {
    await apiClient.delete(`/files/${id}`);
  },
};
