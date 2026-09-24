import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { UserEntity } from 'src/modules/user/domain/user.entity';
import { UserAlreadyExistsException } from 'src/shared/exceptions/domain-exceptions';
import { IEventBus, EVENT_BUS } from 'src/shared/events/event-bus';
import { UserCreatedEvent } from 'src/modules/user/domain/user-created.event';
import { TokenService } from 'src/modules/auth/application/token.service';

export interface RegisterUserCommand {
  email: string;
  password: string;
  username: string;
}

export interface AuthTokenResult {
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
  access_token_expires_at: Date;
  refresh_token_expires_in: number;
  refresh_token_expires_at: Date;
  user: { id: string; email: string; username: string };
}

// Use case đăng ký tài khoản: validate trùng email → hash password → tạo user
// → publish UserCreatedEvent → trả về cặp access/refresh token + thông tin user.
@Injectable()
export class RegisterUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: RegisterUserCommand): Promise<AuthTokenResult> {
    const alreadyExists = await this.userRepository.existsByEmail(
      command.email,
    );
    if (alreadyExists) {
      throw new UserAlreadyExistsException(command.email);
    }

    const hashedPassword = await bcrypt.hash(command.password, 10);

    const user = UserEntity.create({
      email: command.email,
      password: hashedPassword,
      username: command.username,
    });

    const savedUser = await this.userRepository.save(user);
    if (!savedUser.id) throw new Error('Saved user is missing id');

    this.eventBus.publish(
      new UserCreatedEvent(savedUser.id, savedUser.email, savedUser.username),
    );

    const tokens = await this.tokenService.issueTokens({
      sub: savedUser.id,
      email: savedUser.email,
      username: savedUser.username,
    });
    return {
      ...tokens,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        username: savedUser.username,
      },
    };
  }
}
