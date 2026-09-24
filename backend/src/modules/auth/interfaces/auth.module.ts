import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../infrastructure/jwt.strategy';
import { TokenBlacklistService } from '../infrastructure/token-blacklist.service';
import {
  RefreshTokenDocument,
  RefreshTokenSchema,
} from '../infrastructure/refresh-token.schema';
import {
  BlacklistedTokenDocument,
  BlacklistedTokenSchema,
} from '../infrastructure/blacklisted-token.schema';
import { RefreshTokenRepository } from '../infrastructure/refresh-token.repository';
import { IRefreshTokenRepository } from '../domain/i-refresh-token.repository';
import { TokenService } from '../application/token.service';
import { RefreshTokensUseCase } from '../application/use-cases/refresh-tokens.usecase';
import { RevokeRefreshTokenUseCase } from '../application/use-cases/revoke-refresh-token.usecase';
import { SendVerificationLinkUseCase } from '../application/use-cases/send-verification-link.usecase';
import { VerifyAndCreateUserUseCase } from '../application/use-cases/verify-and-create-user.usecase';
import { LoginUserUseCase } from '../application/use-cases/login-user.usecase';
import { UserModule } from 'src/modules/user/interfaces/users.module';
import { MailModule } from 'src/modules/mail/mail.module';
import {
  VerificationToken,
  VerificationTokenSchema,
} from '../infrastructure/verification-token.schema';

@Module({
  imports: [
    PassportModule,
    UserModule,
    MailModule,
    MongooseModule.forFeature([
      { name: RefreshTokenDocument.name, schema: RefreshTokenSchema },
      { name: BlacklistedTokenDocument.name, schema: BlacklistedTokenSchema },
      { name: VerificationToken.name, schema: VerificationTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    TokenBlacklistService,
    { provide: IRefreshTokenRepository, useClass: RefreshTokenRepository },
    TokenService,
    SendVerificationLinkUseCase,
    VerifyAndCreateUserUseCase,
    LoginUserUseCase,
    RefreshTokensUseCase,
    RevokeRefreshTokenUseCase,
  ],
  exports: [TokenBlacklistService],
})
export class AuthModule {}
