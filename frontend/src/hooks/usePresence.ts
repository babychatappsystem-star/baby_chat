import { useContext } from 'react';
import { PresenceContext } from '../contexts/presence-context';
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
    return { online: true, label: 'Active now' };
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
    label = 'Active just now';
  } else if (diffMinutes < 60) {
    label = `Active ${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    label = `Active ${diffHours}h ago`;
  } else {
    label = `Active ${diffDays}d ago`;
  }

  return {
    online: false,
    label,
  };
}
