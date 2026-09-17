import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { IStorageProvider } from 'src/modules/file/domain/i-storage.provider';

@Injectable()
export class CloudinaryStorageProvider extends IStorageProvider {
  private readonly logger = new Logger(CloudinaryStorageProvider.name);

  constructor(private readonly configService: ConfigService) {
    super();
    // Khởi tạo Cloudinary (sẽ chỉ kết nối được khi có biến môi trường CLOUDINARY_URL hoặc các biến cụ thể)
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async save(buffer: Buffer, filename: string): Promise<{ url: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'babychat_avatars',
          public_id: filename.split('.')[0], // Bỏ đuôi file để Cloudinary tự quyết định định dạng tối ưu nhất (nếu có auto-format)
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            this.logger.error('Lỗi khi upload file lên Cloudinary', error);
            return reject(error);
          }
          if (!result) {
            return reject(new Error('Không nhận được kết quả từ Cloudinary'));
          }
          resolve({ url: result.secure_url });
        },
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  }

  async delete(filename: string): Promise<void> {
    const publicId = `babychat_avatars/${filename.split('.')[0]}`;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa file ${publicId} trên Cloudinary`, error);
    }
  }
}
