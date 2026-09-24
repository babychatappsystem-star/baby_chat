import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/interfaces/guards/jwt-auth.guard';
import { CurrentUser } from 'src/shared/decorators/current-user.decorator';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import {
  PushSubscriptionDto,
  UnsubscribePushDto,
} from './dto/push-subscription.dto';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    @Inject(IUserRepository)
    private readonly userRepository: IUserRepository,
  ) {}

  @Post('subscribe')
  @HttpCode(200)
  async subscribe(
    @CurrentUser('userId') userId: string,
    @Body() subscription: PushSubscriptionDto,
  ): Promise<{ success: true }> {
    await this.userRepository.addPushSubscription(userId, {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    });
    return { success: true };
  }

  @Delete('subscribe')
  @HttpCode(200)
  async unsubscribe(
    @CurrentUser('userId') userId: string,
    @Body() dto: UnsubscribePushDto,
  ): Promise<{ success: true }> {
    await this.userRepository.removePushSubscription(userId, dto.endpoint);
    return { success: true };
  }
}
