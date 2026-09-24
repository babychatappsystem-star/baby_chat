import { Inject, Injectable } from '@nestjs/common';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { DomainError } from 'src/shared/exceptions/domain-error';

@Injectable()
export class UpdateExpressiveChatSettingsUseCase {
  constructor(
    @Inject(IUserRepository) private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string, thresholds: number, transitionTime: number, emojis?: string[]): Promise<void> {
    if (thresholds < 2 || thresholds > 10) {
      throw new DomainError('Thresholds must be between 2 and 10');
    }
    if (transitionTime < 100 || transitionTime > 2000) {
      throw new DomainError('Transition time must be between 100 and 2000');
    }
    if (emojis) {
      if (emojis.length < 2 || emojis.length > 10) {
        throw new DomainError('Emojis count must be between 2 and 10');
      }
    }
    await this.userRepository.updateExpressiveChatSettings(userId, thresholds, transitionTime, emojis);
  }
}
