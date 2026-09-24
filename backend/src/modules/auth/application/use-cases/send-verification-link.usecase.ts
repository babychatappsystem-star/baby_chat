import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import {
  UserAlreadyExistsException,
  VerificationEmailCooldownException,
} from 'src/shared/exceptions/domain-exceptions';
import { MailService } from 'src/modules/mail/mail.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationToken } from 'src/modules/auth/infrastructure/verification-token.schema';
import * as crypto from 'crypto';

// Chống spam hộp thư của 1 người từ nhiều IP (rate limit theo IP không chặn được).
const RESEND_COOLDOWN_MS = 60_000;

export interface SendVerificationLinkCommand {
  email: string;
}

@Injectable()
export class SendVerificationLinkUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @InjectModel(VerificationToken.name)
    private readonly verificationTokenModel: Model<VerificationToken>,
    private readonly mailService: MailService,
  ) {}

  async execute(command: SendVerificationLinkCommand): Promise<void> {
    const email = command.email.toLowerCase();

    // 1. Kiểm tra email đã tồn tại trong users chưa
    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      throw new UserAlreadyExistsException(email);
    }

    const latest = await this.verificationTokenModel
      .findOne({ email })
      .sort({ createdAt: -1 });
    const elapsed = latest ? Date.now() - latest.createdAt.getTime() : Infinity;
    if (elapsed < RESEND_COOLDOWN_MS) {
      throw new VerificationEmailCooldownException(
        Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
      );
    }

    // 2. Tạo token ngẫu nhiên
    const token = crypto.randomBytes(32).toString('hex');

    // 3. Xóa các token cũ của email này (nếu có) và tạo mới
    await this.verificationTokenModel.deleteMany({ email });
    await this.verificationTokenModel.create({
      email,
      token,
    });

    // 4. Gửi email xác nhận
    try {
      await this.mailService.sendVerificationLink(email, token);
    } catch (err) {
      // Gửi lỗi → bỏ token để user thử lại ngay, không bị cooldown chặn.
      await this.verificationTokenModel.deleteOne({ email, token });
      throw err;
    }
  }
}
