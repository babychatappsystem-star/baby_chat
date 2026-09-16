import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: parseInt(this.configService.get<string>('SMTP_PORT') || '587', 10),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true', // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendVerificationLink(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    this.logger.log(`Using FRONTEND_URL: ${frontendUrl}`);
    const verificationLink = `${frontendUrl}/create-password?token=${token}&email=${encodeURIComponent(email)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Xác nhận đăng ký tài khoản BabyChat</h2>
        <p>Chào bạn,</p>
        <p>Cảm ơn bạn đã đăng ký tham gia BabyChat. Để hoàn tất đăng ký và tạo mật khẩu, vui lòng click vào đường link bên dưới:</p>
        <p style="margin: 20px 0;">
          <a href="${verificationLink}" style="background-color: #ff4d4f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Tạo mật khẩu & Đăng nhập</a>
        </p>
        <p><i>Lưu ý: Link này sẽ hết hạn sau 15 phút.</i></p>
        <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.</p>
        <p>Trân trọng,<br>Đội ngũ BabyChat</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"BabyChat" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: 'BabyChat - Xác nhận tài khoản',
        html,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error);
      throw new Error('Không thể gửi email xác nhận. Vui lòng kiểm tra lại cấu hình.');
    }
  }
}
