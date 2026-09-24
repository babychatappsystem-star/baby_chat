import { SendVerificationLinkUseCase } from './send-verification-link.usecase';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { MailService } from 'src/modules/mail/mail.service';
import { VerificationEmailCooldownException } from 'src/shared/exceptions/domain-exceptions';

describe('SendVerificationLinkUseCase', () => {
  let latest: { createdAt: Date } | null;
  let model: {
    findOne: jest.Mock;
    deleteMany: jest.Mock;
    create: jest.Mock;
    deleteOne: jest.Mock;
  };
  let mail: { sendVerificationLink: jest.Mock };
  let useCase: SendVerificationLinkUseCase;

  beforeEach(() => {
    latest = null;
    model = {
      findOne: jest.fn(() => ({
        sort: jest.fn().mockImplementation(async () => latest),
      })),
      deleteMany: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue(undefined),
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };
    mail = { sendVerificationLink: jest.fn().mockResolvedValue(undefined) };
    useCase = new SendVerificationLinkUseCase(
      {
        existsByEmail: jest.fn().mockResolvedValue(false),
      } as unknown as IUserRepository,
      model as never,
      mail as unknown as MailService,
    );
  });

  it('sends when no recent link exists', async () => {
    await useCase.execute({ email: 'A@x.com' });
    expect(mail.sendVerificationLink).toHaveBeenCalledWith(
      'a@x.com',
      expect.any(String),
    );
  });

  it('rejects a second request within 60 seconds', async () => {
    latest = { createdAt: new Date(Date.now() - 10_000) };
    await expect(useCase.execute({ email: 'a@x.com' })).rejects.toBeInstanceOf(
      VerificationEmailCooldownException,
    );
    expect(mail.sendVerificationLink).not.toHaveBeenCalled();
  });

  it('allows a new request after the cooldown', async () => {
    latest = { createdAt: new Date(Date.now() - 61_000) };
    await useCase.execute({ email: 'a@x.com' });
    expect(mail.sendVerificationLink).toHaveBeenCalledTimes(1);
  });

  it('removes the token when sending fails so the user can retry', async () => {
    mail.sendVerificationLink.mockRejectedValue(new Error('smtp down'));
    await expect(useCase.execute({ email: 'a@x.com' })).rejects.toThrow(
      'smtp down',
    );
    expect(model.deleteOne).toHaveBeenCalledWith({
      email: 'a@x.com',
      token: expect.any(String),
    });
  });
});
