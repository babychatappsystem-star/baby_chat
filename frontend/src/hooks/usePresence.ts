import { useContext } from 'react';
import { PresenceContext } from '../contexts/PresenceContext';
import dayjs from 'dayjs';

export interface UsePresenceResult {
  online: boolean;
  label: string;
}

export function usePresence(userId?: string): UsePresenceResult {
  const { presenceMap } = useContext(PresenceContext);

  if (!userId) {
    return { online: false, label: '' };
  }

  const state = presenceMap[userId];

  if (!state) {
    return { online: false, label: '' };
  }

  if (state.online) {
    return { online: true, label: 'Đang hoạt động' };
  }

  if (!state.lastSeenAt) {
    return { online: false, label: '' }; // Offline và ẩn trạng thái
  }

  // Format lastSeenAt
  const lastSeen = dayjs(state.lastSeenAt);
  const now = dayjs();
  const diffMinutes = now.diff(lastSeen, 'minute');
  const diffHours = now.diff(lastSeen, 'hour');
  const diffDays = now.diff(lastSeen, 'day');

  let label = '';
  if (diffMinutes < 1) {
    label = 'Truy cập vừa xong';
  } else if (diffMinutes < 60) {
    label = `Truy cập ${diffMinutes} phút trước`;
  } else if (diffHours < 24) {
    label = `Truy cập ${diffHours} giờ trước`;
  } else {
    label = `Truy cập ${diffDays} ngày trước`;
  }

  return {
    online: false,
    label,
  };
}
