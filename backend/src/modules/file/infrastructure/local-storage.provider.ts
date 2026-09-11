import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { IStorageProvider } from 'src/modules/file/domain/i-storage.provider';

// Lưu file vào thư mục local (UPLOAD_DIR, default ./uploads) và serve qua static
// route /uploads. URL trả về là relative path để FE tự ghép base URL.
@Injectable()
export class LocalStorageProvider extends IStorageProvider implements OnModuleInit {
  private readonly uploadDir: string;
  private readonly urlPrefix = '/uploads';

  constructor(private readonly configService: ConfigService) {
    super();
    this.uploadDir = this.configService.get<string>('UPLOAD_DIR') ?? './uploads';
  }

  // Đảm bảo thư mục upload tồn tại lúc bootstrap.
  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async save(buffer: Buffer, filename: string): Promise<{ url: string }> {
    const fullPath = join(this.uploadDir, filename);
    await fs.writeFile(fullPath, buffer);
    return { url: `${this.urlPrefix}/${filename}` };
  }

  // Idempotent — bỏ qua lỗi ENOENT (file đã không tồn tại).
  async delete(filename: string): Promise<void> {
    try {
      await fs.unlink(join(this.uploadDir, filename));
    } catch (err: any) {
      if (err?.code !== 'ENOENT') throw err;
    }
  }
}
