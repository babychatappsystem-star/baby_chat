import * as crypto from 'crypto';

// Bộ ký tự loại bỏ 0/O, 1/I/L để code dễ đọc khi share bằng giọng nói/giấy.
// 32 ký tự ↑ 8 vị trí ≈ 1.1 nghìn tỷ tổ hợp — đủ chống brute-force.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LENGTH = 8;

// Sinh 1 friend code random. Dùng crypto.randomInt cho phân phối đều.
export function generateFriendCode(): string {
  let code = '';
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  }
  return code;
}

// Normalize code do user nhập: bỏ space/dấu gạch, uppercase.
export function normalizeFriendCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}
