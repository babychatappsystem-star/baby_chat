import apiClient from '../api/apiClient';
import { getApiErrorMessage } from '../utils/apiError';
import type { FileCategory, FileUploadResponse } from '../types/api.types';

const ERROR_MESSAGES: Record<string, string> = {
  InvalidFileType: 'Only JPG, PNG, WEBP, GIF images are accepted',
  MissingFile:     'Please select an image',
  FileTooLarge:    'Image must not exceed 5MB',
  FileNotFound:    'File not found',
  FileAccessDenied: 'You do not have permission for this file',
};

export const getFileErrorMessage = (error: unknown, fallback = 'An error occurred'): string =>
  getApiErrorMessage(error, fallback, ERROR_MESSAGES);

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Validate phía client trước khi upload — server vẫn validate lại.
export const validateImageFile = (file: File): string | null => {
  if (!ALLOWED_TYPES.includes(file.type)) return 'Only JPG, PNG, WEBP, GIF images are accepted';
  if (file.size > MAX_SIZE) return 'Image must not exceed 5MB';
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
