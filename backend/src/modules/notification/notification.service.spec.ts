import * as webpush from 'web-push';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { IUserRepository } from 'src/modules/user/domain/i-user.repository';
import { IConversationRepository } from 'src/modules/conversation/domain/i-conversation.repository';
import { PresenceService } from 'src/modules/realtime/presence/presence.service';
import { MessageSentEvent } from 'src/modules/message/domain/message-sent.event';

jest.mock('web-push', () => ({
  sendNotification: jest.fn().mockResolvedValue(undefined),
  setVapidDetails: jest.fn(),
}));

const SUB = {
  endpoint: 'https://push.example/1',
  keys: { p256dh: 'p', auth: 'a' },
};

describe('NotificationService push payload', () => {
  const users: Record<string, object> = {
    alice: { id: 'alice', username: 'alice', pushSubscriptions: [] },
    bob: { id: 'bob', username: 'bob', pushSubscriptions: [SUB] },
  };
  const presence = new PresenceService();
  const service = new NotificationService(
    {} as ConfigService,
    {
      findById: jest.fn(async (id: string) => users[id] ?? null),
      removePushSubscription: jest.fn(),
    } as unknown as IUserRepository,
    {
      findById: jest.fn(async () => ({
        participants: [{ userId: 'alice' }, { userId: 'bob' }],
      })),
    } as unknown as IConversationRepository,
    presence,
  );
  const sent = () =>
    JSON.parse((webpush.sendNotification as jest.Mock).mock.calls.at(-1)[1]);

  beforeEach(() => (webpush.sendNotification as jest.Mock).mockClear());

  it('uses English text with the message content', async () => {
    await service.handleMessageSentEvent(
      new MessageSentEvent('c1', 'alice', 'm1', 'hello', 'p1'),
    );
    expect(sent()).toEqual({
      title: 'BabyChat',
      body: 'alice: hello',
      url: '/messages?c=c1',
    });
  });

  it('uses a generic English sentence when there is no text (image/sticker)', async () => {
    await service.handleMessageSentEvent(
      new MessageSentEvent('c1', 'alice', 'm2', '', 'p1'),
    );
    expect(sent().body).toBe('alice sent a message');
  });

  it('does not push to a user who is viewing the app', async () => {
    presence.setSocketFocus('bob', 's1', true);
    await service.handleMessageSentEvent(
      new MessageSentEvent('c1', 'alice', 'm3', 'hi', 'p1'),
    );
    expect(webpush.sendNotification).not.toHaveBeenCalled();
    presence.setSocketFocus('bob', 's1', false);
  });
});
