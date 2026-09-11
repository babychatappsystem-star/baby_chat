import { useState, useCallback } from 'react';
import { useSocketEvent } from './useSocketEvent';
import { WS_EVENTS } from '../lib/wsEvents';

export type NotificationType = 'message' | 'friend_request' | 'friend_accepted';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: Date;
  read: boolean;
}

const MAX_NOTIFICATIONS = 20;

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const push = useCallback((n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    setNotifications((prev) => [
      { ...n, id: `${Date.now()}-${Math.random()}`, createdAt: new Date(), read: false },
      ...prev.slice(0, MAX_NOTIFICATIONS - 1),
    ]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  useSocketEvent(WS_EVENTS.MESSAGE_NEW, (payload) => {
    // Không hiện notification cho tin nhắn do chính mình gửi.
    const myId = localStorage.getItem('userId');
    if (payload.senderId === myId) return;
    push({
      type: 'message',
      title: 'Tin nhắn mới',
      description: payload.content,
    });
  });

  useSocketEvent(WS_EVENTS.FRIENDSHIP_REQUEST_RECEIVED, (payload) => {
    push({
      type: 'friend_request',
      title: 'Lời mời kết bạn',
      description: `${payload.requesterUsername} muốn kết bạn với bạn`,
    });
  });

  useSocketEvent(WS_EVENTS.FRIENDSHIP_ACCEPTED, (payload) => {
    push({
      type: 'friend_accepted',
      title: 'Kết bạn thành công',
      description: `${payload.recipientUsername} đã chấp nhận lời mời của bạn`,
    });
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead, clearAll };
};
