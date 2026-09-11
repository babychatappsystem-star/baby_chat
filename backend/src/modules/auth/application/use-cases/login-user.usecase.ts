import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { InvalidCredentialsException } from 'src/shared/exceptions/domain-exceptions';
import { TokenService } from 'src/modules/auth/application/token.service';
import { AuthTokenResult } from './register-user.usecase';

export interface LoginUserCommand {
  email: string;
  password: string;
}

// Use case đăng nhập: tìm user theo email → so khớp password (bcrypt) → cấp cặp
// access + refresh token qua TokenService. Bất kỳ lỗi nào (sai email hoặc sai password)
// đều trả về InvalidCredentialsException để chống enumerate.
@Injectable()
export class LoginUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: LoginUserCommand): Promise<AuthTokenResult> {
    const user = await this.userRepository.findByEmail(command.email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const passwordMatch = await bcrypt.compare(command.password, user.password);
    if (!passwordMatch) {
      throw new InvalidCredentialsException();
    }

    if (!user.id) throw new Error('User from repository is missing id');

    const tokens = await this.tokenService.issueTokens({
      sub: user.id,
      email: user.email,
      username: user.username,
    });
    return {
      ...tokens,
      user: { id: user.id, email: user.email, username: user.username },
    };
  }
}
