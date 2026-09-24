import { UpdateExpressiveChatSettingsUseCase } from './update-expressive-chat-settings.usecase';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';

describe('UpdateExpressiveChatSettingsUseCase', () => {
  let useCase: UpdateExpressiveChatSettingsUseCase;
  let mockUserRepository: Partial<IUserRepository>;

  beforeEach(() => {
    mockUserRepository = {
      updateExpressiveChatSettings: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new UpdateExpressiveChatSettingsUseCase(
      mockUserRepository as IUserRepository,
    );
  });

  it('should successfully update settings with valid parameters and up to 10 emojis', async () => {
    const emojis = ['🙂', '😀', '😄', '😆', '😂', '🥰', '😍', '🤩', '😎', '🔥'];
    await useCase.execute('user-123', 10, 500, emojis);

    expect(
      mockUserRepository.updateExpressiveChatSettings,
    ).toHaveBeenCalledWith('user-123', 10, 500, emojis);
  });

  it('should throw error when thresholds is less than 2 or greater than 10', async () => {
    await expect(useCase.execute('user-123', 1, 300)).rejects.toThrow(
      'Thresholds must be between 2 and 10',
    );
    await expect(useCase.execute('user-123', 11, 300)).rejects.toThrow(
      'Thresholds must be between 2 and 10',
    );
  });

  it('should throw error when transitionTime is out of range', async () => {
    await expect(useCase.execute('user-123', 5, 50)).rejects.toThrow(
      'Transition time must be between 100 and 2000',
    );
    await expect(useCase.execute('user-123', 5, 2500)).rejects.toThrow(
      'Transition time must be between 100 and 2000',
    );
  });

  it('should throw error when emojis count is less than 2 or greater than 10', async () => {
    await expect(useCase.execute('user-123', 5, 300, ['🙂'])).rejects.toThrow(
      'Emojis count must be between 2 and 10',
    );
    const tooMany = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
    await expect(useCase.execute('user-123', 5, 300, tooMany)).rejects.toThrow(
      'Emojis count must be between 2 and 10',
    );
  });
});
