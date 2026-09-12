import React, { createContext, useCallback, useState } from 'react';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useSocketConnect } from '../hooks/useSocketConnect';
import { getMyFriendsPresence } from '../services/presenceService';

export interface PresenceState {
  online: boolean;
  lastSeenAt?: string;
}

export type PresenceMap = Record<string, PresenceState>;

export interface PresenceContextValue {
  presenceMap: PresenceMap;
}

export const PresenceContext = createContext<PresenceContextValue>({ presenceMap: {} });

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [presenceMap, setPresenceMap] = useState<PresenceMap>({});

  useSocketConnect(() => {
    getMyFriendsPresence()
      .then((friendsPresence) => {
        setPresenceMap((prev) => {
          const newMap = { ...prev };
          for (const fp of friendsPresence) {
            newMap[fp.userId] = { online: fp.online, lastSeenAt: fp.lastSeenAt };
          }
          return newMap;
        });
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
