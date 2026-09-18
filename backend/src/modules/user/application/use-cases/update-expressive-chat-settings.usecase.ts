import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';

@Injectable()
export class UpdateExpressiveChatSettingsUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string, thresholds: number, transitionTime: number): Promise<void> {
    if (thresholds < 2 || thresholds > 5) {
      throw new Error('Thresholds must be between 2 and 5');
    }
    if (transitionTime < 100 || transitionTime > 2000) {
      throw new Error('Transition time must be between 100 and 2000');
    }
    await this.userRepository.updateExpressiveChatSettings(userId, thresholds, transitionTime);
  }
}
