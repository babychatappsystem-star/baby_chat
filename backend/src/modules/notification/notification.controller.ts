import { Controller, Post, Body, Req, UseGuards, Delete, HttpCode } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/modules/auth/interfaces/guards/jwt-auth.guard';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { Inject } from '@nestjs/common';

export interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  @Post('subscribe')
  @HttpCode(200)
  async subscribe(@Req() req: Request, @Body() subscription: PushSubscriptionDto) {
    const user = (req as any).user;
    
    if (!subscription.endpoint || !subscription.keys) {
      throw new Error('Invalid subscription payload');
    }

    await this.userRepository.addPushSubscription(user.sub, subscription);
    return { success: true };
  }

  @Delete('subscribe')
  @HttpCode(200)
  async unsubscribe(@Req() req: Request, @Body('endpoint') endpoint: string) {
    const user = (req as any).user;
    
    if (!endpoint) {
      throw new Error('Endpoint is required');
    }

    await this.userRepository.removePushSubscription(user.sub, endpoint);
    return { success: true };
  }
}
