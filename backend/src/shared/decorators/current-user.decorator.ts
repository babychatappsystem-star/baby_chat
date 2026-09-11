import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Thông tin user được JwtStrategy.validate() return và Passport gán vào req.user.
export interface AuthUser {
  userId: string;
  email: string;
  username?: string;
  roles?: string[];
}

/**
 * Custom decorator lấy user hiện tại từ request (đã được JwtAuthGuard xác thực).
 *
 * Cách dùng:
 *   handler(@CurrentUser() user: AuthUser) { ... }
 *   handler(@CurrentUser('userId') userId: string) { ... }
 *
 * Lưu ý: chỉ dùng trong route có @UseGuards(JwtAuthGuard); nếu không, user sẽ undefined.
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    return field ? user?.[field] : user;
  },
);
