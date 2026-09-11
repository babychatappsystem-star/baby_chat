import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { FILE_CATEGORIES } from 'src/modules/file/domain/file.entity';
import type { FileCategory } from 'src/modules/file/domain/file.entity';

export class UploadFileDto {
  @ApiPropertyOptional({
    enum: FILE_CATEGORIES,
    example: 'message_image',
    description: 'Phân loại file. Mặc định "other" nếu không truyền.',
  })
  @IsOptional()
  @IsIn(FILE_CATEGORIES)
  category?: FileCategory;
}
