// Presence types — dùng nội bộ trong RealtimeModule.
// PresenceEntry lưu trong Map của PresenceService (RAM, không persist).

export interface PresenceEntry {
  connectionCount: number;
  lastSeenAt: Date;
}

export interface PresenceStatus {
  online: boolean;
  lastSeenAt?: Date; // undefined khi đang online hoặc user ẩn trạng thái
}
