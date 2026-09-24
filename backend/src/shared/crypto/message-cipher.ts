import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const KEY_ID = /^[A-Za-z0-9_-]+$/;

export const GENERATE_KEY_HINT =
  "node -e \"console.log('k1:' + require('crypto').randomBytes(32).toString('base64'))\"";

// Mã hoá nội dung tin nhắn khi lưu DB (AES-256-GCM).
// Định dạng: enc:v1:<keyId>:<iv>:<tag>:<ciphertext> (base64 không chứa ':').
// Khoá đầu danh sách dùng để mã hoá; các khoá sau chỉ để giải mã dữ liệu cũ (xoay khoá).
// AAD (vd "<messageId>:content") gắn ciphertext với đúng tin/trường — tráo sang tin khác sẽ fail.
export class MessageCipher {
  private constructor(
    private readonly keys: ReadonlyMap<string, Buffer>,
    private readonly activeKeyId: string,
  ) {}

  // raw: "k2:<base64>,k1:<base64>" (thường lấy từ MESSAGE_ENCRYPTION_KEYS).
  static fromKeyList(raw: string | undefined): MessageCipher {
    if (!raw?.trim()) {
      throw new Error(
        `MESSAGE_ENCRYPTION_KEYS is not set. Generate a key with: ${GENERATE_KEY_HINT}`,
      );
    }
    const keys = new Map<string, Buffer>();
    for (const entry of raw
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean)) {
      const sep = entry.indexOf(':');
      const id = sep > 0 ? entry.slice(0, sep) : '';
      if (!KEY_ID.test(id)) {
        throw new Error(
          `Invalid MESSAGE_ENCRYPTION_KEYS entry: expected "<keyId>:<base64 key>"`,
        );
      }
      const key = Buffer.from(entry.slice(sep + 1), 'base64');
      if (key.length !== KEY_BYTES) {
        throw new Error(
          `Encryption key '${id}' must be ${KEY_BYTES} bytes (base64-encoded), got ${key.length}`,
        );
      }
      if (keys.has(id)) throw new Error(`Duplicate encryption key id '${id}'`);
      keys.set(id, key);
    }
    const [activeKeyId] = keys.keys();
    if (!activeKeyId) throw new Error('MESSAGE_ENCRYPTION_KEYS has no keys');
    return new MessageCipher(keys, activeKeyId);
  }

  static isEncrypted(value: string | null | undefined): boolean {
    return typeof value === 'string' && value.startsWith(PREFIX);
  }

  encrypt(plaintext: string, aad: string): string {
    const key = this.keys.get(this.activeKeyId)!;
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(Buffer.from(aad, 'utf8'));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${this.activeKeyId}:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
  }

  // Giá trị chưa mã hoá (dữ liệu cũ trước khi migrate) được trả nguyên.
  decrypt(value: string, aad: string): string {
    if (!MessageCipher.isEncrypted(value)) return value;
    const parts = value.slice(PREFIX.length).split(':');
    if (parts.length !== 4) throw new Error('Malformed encrypted value');
    const [keyId, iv, tag, ciphertext] = parts;
    const key = this.keys.get(keyId);
    if (!key) throw new Error(`Unknown encryption key id '${keyId}'`);
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(iv, 'base64'),
    );
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  // Tiện ích cho field optional: rỗng/undefined giữ nguyên, đã mã hoá thì không mã hoá lại.
  encryptField<T extends string | undefined>(value: T, aad: string): T {
    if (!value || MessageCipher.isEncrypted(value)) return value;
    return this.encrypt(value, aad) as T;
  }
}

export const messageAad = (
  messageId: string,
  field: 'content' | 'replySnippet',
) => `${messageId}:${field}`;
