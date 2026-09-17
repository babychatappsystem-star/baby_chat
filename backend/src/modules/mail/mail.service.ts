import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendVerificationLink(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    this.logger.log(`Using FRONTEND_URL: ${frontendUrl}`);
    const verificationLink = `${frontendUrl}/create-password?token=${token}&email=${encodeURIComponent(email)}`;

    const htmlContent = `
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

    const fromEmail = this.configService.get<string>('SMTP_FROM');
    const apiKey = this.configService.get<string>('BREVO_API_KEY');

    if (!apiKey) {
      this.logger.error('Missing BREVO_API_KEY in environment variables');
      throw new Error('Chưa cấu hình API Key để gửi mail.');
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          sender: { name: 'BabyChat', email: fromEmail },
          to: [{ email: email }],
          subject: 'BabyChat - Xác nhận tài khoản',
          htmlContent: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        this.logger.error(`Brevo API Error: ${errorData}`);
        throw new Error('Lỗi từ API Brevo');
      }

      this.logger.log(`Verification email sent to ${email} via Brevo API`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}`, error);
      throw new Error('Không thể gửi email xác nhận. Vui lòng thử lại.');
    }
  }
}
