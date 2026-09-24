import { PresenceService } from './presence.service';

describe('PresenceService focus tracking', () => {
  it('is focused while at least one socket of the user is focused', () => {
    const presence = new PresenceService();
    expect(presence.isFocused('u1')).toBe(false);
    presence.setSocketFocus('u1', 's1', true);
    presence.setSocketFocus('u1', 's2', true);
    presence.setSocketFocus('u1', 's1', false);
    expect(presence.isFocused('u1')).toBe(true);
    presence.setSocketFocus('u1', 's2', false);
    expect(presence.isFocused('u1')).toBe(false);
    expect(presence.isFocused('u2')).toBe(false);
  });
});
