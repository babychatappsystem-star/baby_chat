import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from 'src/modules/auth/interfaces/guards/jwt-auth.guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import {
  FileTooLargeException,
  InvalidFileTypeException,
  MissingFileException,
} from 'src/shared/exceptions/domain-exceptions';
import { UploadImageUseCase } from 'src/modules/file/application/use-cases/upload-image.usecase';
import { GetFileUseCase } from 'src/modules/file/application/use-cases/get-file.usecase';
import { DeleteFileUseCase } from 'src/modules/file/application/use-cases/delete-file.usecase';
import { UploadFileDto } from './dto/upload-file.dto';
import { FileResponseDto } from './dto/file-response.dto';

const ALLOWED_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Giới hạn Multer đọc từ env (fallback 5MB). Đọc process.env ở module-level vì
// @UseInterceptors là decorator tĩnh — không truy cập được ConfigService (DI).
// ConfigModule isGlobal đã load .env vào process.env lúc bootstrap.
const MAX_UPLOAD_BYTES =
  Number(process.env.UPLOAD_MAX_SIZE_MB ?? 5) * 1024 * 1024;

@ApiTags('files')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileController {
  private readonly maxSizeMb: number;

  constructor(
    private readonly uploadImageUseCase: UploadImageUseCase,
    private readonly getFileUseCase: GetFileUseCase,
    private readonly deleteFileUseCase: DeleteFileUseCase,
    private readonly configService: ConfigService,
  ) {
    this.maxSizeMb = Number(this.configService.get('UPLOAD_MAX_SIZE_MB') ?? 5);
  }

  @ApiOperation({ summary: 'Upload ảnh (avatar / message image / other)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        category: {
          type: 'string',
          enum: [
            'user_avatar',
            'conversation_avatar',
            'message_image',
            'other',
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, type: FileResponseDto })
  @ApiResponse({
    status: 400,
    description: 'File không hợp lệ (sai loại / thiếu file)',
  })
  @ApiResponse({
    status: 413,
    description: 'File vượt quá dung lượng cho phép',
  })
  // POST /files — multipart field `file`. Dùng memoryStorage để có buffer cho sharp.
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      // limits.fileSize: Multer abort stream ngay khi vượt ngưỡng → KHÔNG buffer hết
      // file vào RAM (chống DoS). Khi vượt, Multer ném MulterError 'LIMIT_FILE_SIZE'
      // → GlobalExceptionFilter map sang 413.
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
          // Throw để Nest trả 400 ngay, không vào use case.
          return cb(new InvalidFileTypeException(), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @CurrentUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Query() dto: UploadFileDto,
  ): Promise<FileResponseDto> {
    if (!file) throw new MissingFileException();
    // Multer memoryStorage không enforce size limit qua fileFilter; check thủ công.
    if (file.size > this.maxSizeMb * 1024 * 1024) {
      throw new FileTooLargeException(this.maxSizeMb);
    }

    const result = await this.uploadImageUseCase.execute({
      ownerId: userId,
      category: dto.category ?? 'other',
      originalName: file.originalname,
      buffer: file.buffer,
    });
    return FileResponseDto.fromEntity(result);
  }

  @ApiOperation({ summary: 'Lấy metadata 1 file' })
  @ApiResponse({ status: 200, type: FileResponseDto })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  @Get(':id')
  async getById(@Param('id') id: string): Promise<FileResponseDto> {
    const file = await this.getFileUseCase.execute(id);
    return FileResponseDto.fromEntity(file);
  }

  @ApiOperation({ summary: 'Xóa file (chỉ owner)' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Không phải owner của file' })
  @ApiResponse({ status: 404, description: 'File không tồn tại' })
  @HttpCode(204)
  @Delete(':id')
  async delete(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deleteFileUseCase.execute({ fileId: id, requesterId: userId });
  }
}
