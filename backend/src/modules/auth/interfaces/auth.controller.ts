import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import {
  SendVerificationLinkDto,
  VerifyRegistrationDto,
  LoginDto,
} from './dto/auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  AuthResponseDto,
  ProfileResponseDto,
  LogoutResponseDto,
} from './dto/auth-response.dto';
import { AuthMapper } from './dto/auth.mapper';
import { SendVerificationLinkUseCase } from 'src/modules/auth/application/use-cases/send-verification-link.usecase';
import { VerifyAndCreateUserUseCase } from 'src/modules/auth/application/use-cases/verify-and-create-user.usecase';
import { LoginUserUseCase } from 'src/modules/auth/application/use-cases/login-user.usecase';
import { GetProfileUseCase } from 'src/modules/user/application/use-cases/get-profile.usecase';
import { RefreshTokensUseCase } from 'src/modules/auth/application/use-cases/refresh-tokens.usecase';
import { RevokeRefreshTokenUseCase } from 'src/modules/auth/application/use-cases/revoke-refresh-token.usecase';
import { TokenBlacklistService } from '../infrastructure/token-blacklist.service';

// Controller xử lý đăng ký/đăng nhập/đăng xuất. Chỉ orchestrate — gọi use case.
@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sendVerificationLinkUseCase: SendVerificationLinkUseCase,
    private readonly verifyAndCreateUserUseCase: VerifyAndCreateUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly refreshTokensUseCase: RefreshTokensUseCase,
    private readonly revokeRefreshTokenUseCase: RevokeRefreshTokenUseCase,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly jwtService: JwtService,
  ) {}

  @ApiOperation({ summary: 'Gửi link đăng ký (xác thực email)' })
  @ApiResponse({ status: 201, description: 'Đã gửi link xác nhận' })
  // POST /auth/register — tạo token, gửi qua email
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } })
  @Post('register')
  async register(
    @Body() dto: SendVerificationLinkDto,
  ): Promise<{ message: string }> {
    await this.sendVerificationLinkUseCase.execute({
      email: dto.email,
    });
    return { message: 'Vui lòng kiểm tra email để hoàn tất đăng ký' };
  }

  @ApiOperation({ summary: 'Xác thực token và tạo tài khoản' })
  @ApiResponse({
    status: 201,
    description: 'Tạo tài khoản thành công',
    type: AuthResponseDto,
  })
  // POST /auth/verify-registration — verify token + hash pwd + trả về JWT
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  @Post('verify-registration')
  async verifyRegistration(
    @Body() dto: VerifyRegistrationDto,
  ): Promise<AuthResponseDto> {
    const result = await this.verifyAndCreateUserUseCase.execute({
      email: dto.email,
      token: dto.token,
      password: dto.password,
      username: dto.username,
    });
    return AuthMapper.toAuthResponse(result);
  }

  @ApiOperation({ summary: 'Đăng nhập, trả về JWT' })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công, trả về access_token',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sai email hoặc mật khẩu' })
  @HttpCode(HttpStatus.OK)
  // POST /auth/login — đăng nhập bằng email + password, trả JWT.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    const result = await this.loginUserUseCase.execute({
      email: dto.email,
      password: dto.password,
    });
    return AuthMapper.toAuthResponse(result);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy thông tin profile' })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @UseGuards(JwtAuthGuard)
  // GET /auth/profile — query user từ DB (để có avatar/thumbnail). roles lấy từ JWT payload.
  @SkipThrottle()
  @Get('profile')
  async getProfile(
    @CurrentUser('userId') userId: string,
    @CurrentUser('roles') roles?: string[],
  ): Promise<ProfileResponseDto> {
    const result = await this.getProfileUseCase.execute(userId);
    return AuthMapper.toProfileResponse(result, roles);
  }

  @ApiOperation({
    summary: 'Cấp lại cặp access/refresh token từ refresh token',
  })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({
    status: 401,
    description: 'Refresh token không hợp lệ hoặc đã hết hạn/revoke',
  })
  @HttpCode(HttpStatus.OK)
  // POST /auth/refresh — verify + rotate refresh token. Trả về cặp token mới;
  // refresh token cũ bị revoke sau call này.
  @SkipThrottle()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const result = await this.refreshTokensUseCase.execute({
      refreshToken: dto.refresh_token,
    });
    return AuthMapper.toAuthResponse(result);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Đăng xuất, vô hiệu hóa access + refresh token' })
  @ApiResponse({ status: 200, type: LogoutResponseDto })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  // POST /auth/logout — blacklist access token + revoke refresh token (nếu có trong body).
  @SkipThrottle()
  @Post('logout')
  async logout(
    @Request() req,
    @Body() dto: RefreshTokenDto,
  ): Promise<LogoutResponseDto> {
    const authHeader = req.headers?.authorization as string | undefined;
    const token = authHeader?.split(' ')[1];
    if (token) {
      const decoded = this.jwtService.decode(token) as { exp?: number } | null;
      const expiresAtMs = decoded?.exp
        ? decoded.exp * 1000
        : Date.now() + 24 * 60 * 60 * 1000;
      await this.tokenBlacklistService.add(token, expiresAtMs);
    }
    await this.revokeRefreshTokenUseCase.execute({
      refreshToken: dto.refresh_token,
    });
    return { message: 'Logged out successfully' };
  }
}
