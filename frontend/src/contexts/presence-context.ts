import { createContext } from 'react';

export interface PresenceState {
  online: boolean;
  lastSeenAt?: string;
}

export type PresenceMap = Record<string, PresenceState>;

export interface PresenceContextValue {
  presenceMap: PresenceMap;
}

export const PresenceContext = createContext<PresenceContextValue>({ presenceMap: {} });
