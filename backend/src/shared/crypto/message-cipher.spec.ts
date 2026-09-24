import { randomBytes } from 'crypto';
import { MessageCipher, messageAad } from './message-cipher';

const key = () => randomBytes(32).toString('base64');

describe('MessageCipher', () => {
  const k1 = key();
  const cipher = MessageCipher.fromKeyList(`k1:${k1}`);
  const aad = messageAad('64a1b2c3d4e5f6a7b8c9d0e1', 'content');

  it('round-trips Unicode text and never stores plaintext', () => {
    const text = 'Xin chào 👋 — tiếng Việt có dấu';
    const enc = cipher.encrypt(text, aad);
    expect(enc.startsWith('enc:v1:k1:')).toBe(true);
    expect(enc).not.toContain('chào');
    expect(cipher.decrypt(enc, aad)).toBe(text);
  });

  it('uses a fresh IV for every encryption', () => {
    expect(cipher.encrypt('same', aad)).not.toBe(cipher.encrypt('same', aad));
  });

  it('passes legacy plaintext through unchanged', () => {
    expect(cipher.decrypt('old plaintext', aad)).toBe('old plaintext');
  });

  it('detects tampered ciphertext', () => {
    const enc = cipher.encrypt('hello', aad);
    const parts = enc.split(':');
    const ct = Buffer.from(parts[5], 'base64');
    ct[0] ^= 0xff;
    parts[5] = ct.toString('base64');
    expect(() => cipher.decrypt(parts.join(':'), aad)).toThrow();
  });

  it('rejects ciphertext moved to another message or field (AAD)', () => {
    const enc = cipher.encrypt('hello', aad);
    expect(() =>
      cipher.decrypt(enc, messageAad('64a1b2c3d4e5f6a7b8c9d0e2', 'content')),
    ).toThrow();
    expect(() =>
      cipher.decrypt(
        enc,
        messageAad('64a1b2c3d4e5f6a7b8c9d0e1', 'replySnippet'),
      ),
    ).toThrow();
  });

  it('supports key rotation: new key encrypts, old key still decrypts', () => {
    const oldEnc = cipher.encrypt('from old key', aad);
    const rotated = MessageCipher.fromKeyList(`k2:${key()},k1:${k1}`);
    expect(rotated.decrypt(oldEnc, aad)).toBe('from old key');
    expect(rotated.encrypt('new', aad).startsWith('enc:v1:k2:')).toBe(true);
  });

  it('fails on unknown key id', () => {
    const enc = MessageCipher.fromKeyList(`k9:${key()}`).encrypt('x', aad);
    expect(() => cipher.decrypt(enc, aad)).toThrow(
      "Unknown encryption key id 'k9'",
    );
  });

  it('encryptField keeps empty values and never double-encrypts', () => {
    expect(cipher.encryptField('', aad)).toBe('');
    expect(cipher.encryptField(undefined, aad)).toBeUndefined();
    const enc = cipher.encryptField('hi', aad);
    expect(cipher.encryptField(enc, aad)).toBe(enc);
  });

  it.each([
    [undefined, 'is not set'],
    ['   ', 'is not set'],
    ['nokey', 'expected "<keyId>:<base64 key>"'],
    [`k1:${randomBytes(16).toString('base64')}`, 'must be 32 bytes'],
    [`k1:${key()},k1:${key()}`, "Duplicate encryption key id 'k1'"],
  ])('rejects bad key config %p', (raw, message) => {
    expect(() => MessageCipher.fromKeyList(raw)).toThrow(message);
  });
});
