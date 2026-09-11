import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthController } from "./auth.controller";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "../infrastructure/jwt.strategy";
import { TokenBlacklistService } from "../infrastructure/token-blacklist.service";
import { RefreshTokenDocument, RefreshTokenSchema } from "../infrastructure/refresh-token.schema";
import { BlacklistedTokenDocument, BlacklistedTokenSchema } from "../infrastructure/blacklisted-token.schema";
import { RefreshTokenRepository } from "../infrastructure/refresh-token.repository";
import { IRefreshTokenRepository } from "../domain/i-refresh-token.repository";
import { TokenService } from "../application/token.service";
import { RefreshTokensUseCase } from "../application/use-cases/refresh-tokens.usecase";
import { RevokeRefreshTokenUseCase } from "../application/use-cases/revoke-refresh-token.usecase";
import { RegisterUserUseCase } from "../application/use-cases/register-user.usecase";
import { LoginUserUseCase } from "../application/use-cases/login-user.usecase";
import { UserModule } from "src/modules/user/interfaces/users.module";

@Module({
  imports: [
    PassportModule,
    UserModule,
    MongooseModule.forFeature([
      { name: RefreshTokenDocument.name, schema: RefreshTokenSchema },
      { name: BlacklistedTokenDocument.name, schema: BlacklistedTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    TokenBlacklistService,
    { provide: IRefreshTokenRepository, useClass: RefreshTokenRepository },
    TokenService,
    RegisterUserUseCase,
    LoginUserUseCase,
    RefreshTokensUseCase,
    RevokeRefreshTokenUseCase,
  ],
  exports: [TokenBlacklistService],
})
export class AuthModule {}
