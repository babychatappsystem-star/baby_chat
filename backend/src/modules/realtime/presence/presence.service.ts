import { Injectable, Logger } from '@nestjs/common';
import { PresenceEntry, PresenceStatus } from './presence.types';

// Singleton service lưu trạng thái online của users trong RAM.
// Mỗi entry là số lượng kết nối WS đang mở của user đó.
// KHÔNG dùng Redis — phù hợp single-instance. Nếu scale nhiều instance sau này,
// cần migrate sang Redis Adapter + Pub/Sub.
@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly presence = new Map<string, PresenceEntry>();

  // Ghi nhận kết nối mới. Trả true nếu đây là kết nối ĐẦU TIÊN của user (vừa online).
  userJoined(userId: string): boolean {
    const entry = this.presence.get(userId);
    if (entry) {
      entry.connectionCount++;
      return false; // đã online trước đó
    }
    this.presence.set(userId, { connectionCount: 1, lastSeenAt: new Date() });
    this.logger.debug(`User ${userId} came online (count: 1)`);
    return true; // vừa online
  }

  // Ghi nhận ngắt kết nối. Trả true nếu đây là kết nối CUỐI CÙNG (vừa offline).
  userLeft(userId: string): boolean {
    const entry = this.presence.get(userId);
    if (!entry) return false;

    entry.connectionCount--;
    entry.lastSeenAt = new Date();

    if (entry.connectionCount <= 0) {
      this.presence.delete(userId);
      this.logger.debug(`User ${userId} went offline`);
      return true; // vừa offline
    }
    this.logger.debug(`User ${userId} disconnected a device (count: ${entry.connectionCount})`);
    return false; // vẫn còn kết nối khác
  }

  // Trả trạng thái hiện tại. Nếu hidePresence=true → luôn trả offline, ẩn lastSeen.
  getStatus(userId: string, hidePresence = false): PresenceStatus {
    if (hidePresence) {
      return { online: false, lastSeenAt: undefined };
    }
    const entry = this.presence.get(userId);
    if (entry) {
      return { online: true, lastSeenAt: undefined };
    }
    return { online: false, lastSeenAt: undefined }; // lastSeenAt lấy từ DB
  }

  // Kiểm tra xem user có đang online không (không tính hidePresence — gọi getStatus nếu cần).
  isConnected(userId: string): boolean {
    return this.presence.has(userId);
  }
}
