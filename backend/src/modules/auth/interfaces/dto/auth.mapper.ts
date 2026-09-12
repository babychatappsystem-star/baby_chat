import { AuthTokenResult } from 'src/modules/auth/application/use-cases/register-user.usecase';
import { ProfileResult } from 'src/modules/user/application/use-cases/get-profile.usecase';
import { AuthResponseDto, ProfileResponseDto } from './auth-response.dto';

// Mapper biến kết quả use case (domain) thành DTO trả về cho client.
// Tách biệt domain shape và transport shape — nếu domain đổi, DTO vẫn ổn định.
export class AuthMapper {
  static toAuthResponse(result: AuthTokenResult): AuthResponseDto {
    return {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      access_token_expires_in: result.access_token_expires_in,
      access_token_expires_at: result.access_token_expires_at,
      refresh_token_expires_in: result.refresh_token_expires_in,
      refresh_token_expires_at: result.refresh_token_expires_at,
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
      },
    };
  }

  // roles không nằm trong UserEntity (lấy từ JWT payload) — truyền riêng.
  static toProfileResponse(result: ProfileResult, roles?: string[]): ProfileResponseDto {
    return {
      userId: result.user.id!,
      email: result.user.email,
      username: result.user.username,
      avatarUrl: result.avatarUrl,
      thumbnailUrl: result.thumbnailUrl,
      hidePresence: result.user.hidePresence,
      roles,
    };
  }
}
