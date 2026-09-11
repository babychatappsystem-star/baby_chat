import { IsMongoId, IsOptional, IsIn } from "class-validator";
import mongoose from "mongoose";
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsFileIdAllowedForType } from "./file-id-rule.validator";
import { IsContentValidForType } from "./content-rule.validator";

export class CreateMessageDto {
  // Text: bắt buộc string non-empty. Image: optional (caption), nếu có phải string.
  // Custom validator chặn content non-string ở mọi type (lỗ hổng #2).
  @ApiPropertyOptional({ example: 'Hello world!', description: 'Bắt buộc với type=text, optional với type=image' })
  @IsContentValidForType()
  content: string;

  @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1' })
  @IsMongoId()
  conversationId: mongoose.Types.ObjectId;

  @ApiPropertyOptional({ enum: ['text', 'image'], example: 'text', description: 'Mặc định text' })
  @IsOptional()
  @IsIn(['text', 'image'])
  type?: 'text' | 'image';

  // fileId: bắt buộc + Mongo ObjectId khi type='image'; CẤM khi type khác (lỗ hổng #1).
  // Dùng 1 custom validator vì 2 @ValidateIf chồng nhau bị class-validator ghi đè điều kiện.
  @ApiPropertyOptional({ example: '64a1b2c3d4e5f6a7b8c9d0e3', description: "Chỉ dùng khi type='image'" })
  @IsFileIdAllowedForType()
  fileId?: string;

  @ApiPropertyOptional({ example: '64a1b2c3d4e5f6a7b8c9d0e2', nullable: true })
  @IsMongoId()
  @IsOptional()
  replyId: mongoose.Types.ObjectId | null;
}