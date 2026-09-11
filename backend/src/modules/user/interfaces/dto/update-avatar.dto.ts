import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class UpdateAvatarDto {
  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1', description: 'fileId trả về từ POST /files' })
  @IsMongoId()
  fileId: string;
}
