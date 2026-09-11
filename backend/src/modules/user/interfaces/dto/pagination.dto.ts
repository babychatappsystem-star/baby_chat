import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { UserPublicDto } from './user-public.dto';

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Số trang (bắt đầu từ 1)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Số bản ghi mỗi trang (1-100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PaginatedUsersResponseDto {
  @ApiProperty({ type: [UserPublicDto], description: 'Danh sách users' })
  items: UserPublicDto[];

  @ApiProperty({ example: 100, description: 'Tổng số users' })
  total: number;

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  page: number;

  @ApiProperty({ example: 20, description: 'Số lượng mỗi trang' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Tổng số trang' })
  totalPages: number;
}
