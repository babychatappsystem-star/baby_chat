import React, { useCallback, useState } from 'react';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useSocketConnect } from '../hooks/useSocketConnect';
import { getMyFriendsPresence } from '../services/presenceService';
import { PresenceContext, type PresenceMap } from './presence-context';

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});

  // Server là nguồn đúng mỗi lần (re)connect → thay cả map, không merge, để không
  // giữ lại presence của tài khoản trước khi logout/login trên cùng tab.
  useSocketConnect(() => {
    getMyFriendsPresence()
      .then((friendsPresence) => {
        const newMap: PresenceMap = {};
        for (const fp of friendsPresence) {
          newMap[fp.userId] = { online: fp.online, lastSeenAt: fp.lastSeenAt };
        }
        setPresenceMap(newMap);
      })
      .catch((err) => {
        console.error('Failed to load friends presence:', err);
      });
  });

  useSocketEvent('presence.online', useCallback((payload) => {
    setPresenceMap((prev) => ({
      ...prev,
      [payload.userId]: { online: true, lastSeenAt: undefined },
    }));
  }, []));

  useSocketEvent('presence.offline', useCallback((payload) => {
    setPresenceMap((prev) => ({
      ...prev,
      [payload.userId]: { online: false, lastSeenAt: payload.lastSeenAt ?? undefined },
    }));
  }, []));

  return (
    <PresenceContext.Provider value={{ presenceMap }}>
      {children}
    </PresenceContext.Provider>
  );
};
