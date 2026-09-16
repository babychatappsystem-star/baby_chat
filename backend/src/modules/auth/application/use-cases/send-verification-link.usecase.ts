import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { UserAlreadyExistsException } from 'src/shared/exceptions/domain-exceptions';
import { MailService } from 'src/modules/mail/mail.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationToken } from 'src/modules/auth/infrastructure/verification-token.schema';
import * as crypto from 'crypto';

export interface SendVerificationLinkCommand {
  email: string;
}

@Injectable()
export class SendVerificationLinkUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
    @InjectModel(VerificationToken.name) private readonly verificationTokenModel: Model<VerificationToken>,
    private readonly mailService: MailService,
  ) {}

  async execute(command: SendVerificationLinkCommand): Promise<void> {
    const email = command.email.toLowerCase();
    
    // 1. Kiểm tra email đã tồn tại trong users chưa
    const alreadyExists = await this.userRepository.existsByEmail(email);
    if (alreadyExists) {
      throw new UserAlreadyExistsException(email);
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
    await this.mailService.sendVerificationLink(email, token);
  }
}
