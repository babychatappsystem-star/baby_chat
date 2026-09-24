import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { UserEntity } from 'src/modules/user/domain/user.entity';
import { UserAlreadyExistsException } from 'src/shared/exceptions/domain-exceptions';
import { IEventBus, EVENT_BUS } from 'src/shared/events/event-bus';
import { UserCreatedEvent } from 'src/modules/user/domain/user-created.event';
import { TokenService } from 'src/modules/auth/application/token.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationToken } from 'src/modules/auth/infrastructure/verification-token.schema';
import { AuthTokenResult } from './register-user.usecase';

export interface VerifyAndCreateUserCommand {
  email: string;
  token: string;
  password: string;
  username: string;
}

@Injectable()
export class VerifyAndCreateUserUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @InjectModel(VerificationToken.name)
    private readonly verificationTokenModel: Model<VerificationToken>,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    private readonly tokenService: TokenService,
  ) {}

  async execute(command: VerifyAndCreateUserCommand): Promise<AuthTokenResult> {
    const email = command.email.toLowerCase();

    // 1. Kiểm tra mã xác thực (Token)
    const verificationRecord = await this.verificationTokenModel.findOne({
      email,
      token: command.token,
    });
    if (!verificationRecord) {
      throw new UnauthorizedException(
        'Mã xác thực không hợp lệ hoặc đã hết hạn.',
      );
    }

    // 2. Kiểm tra xem user có tồn tại chưa (đề phòng)
    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      throw new UserAlreadyExistsException(email);
    }

    // 3. Tạo User
    const hashedPassword = await bcrypt.hash(command.password, 10);
    const user = UserEntity.create({
      email,
      password: hashedPassword,
      username: command.username,
    });

    const savedUser = await this.userRepository.save(user);
    if (!savedUser.id) throw new Error('Saved user is missing id');

    // 4. Xóa mã xác thực
    await this.verificationTokenModel.deleteOne({
      _id: verificationRecord._id,
    });

    // 5. Phát sự kiện
    this.eventBus.publish(
      new UserCreatedEvent(savedUser.id, savedUser.email, savedUser.username),
    );

    // 6. Cấp token
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
