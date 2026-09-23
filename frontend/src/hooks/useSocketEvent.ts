import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import type { ServerToClientEvents } from '../lib/wsEvents';

type EventName = keyof ServerToClientEvents;
type PayloadOf<E extends EventName> = Parameters<ServerToClientEvents[E]>[0];

// Lắng nghe một socket event. Handler được giữ trong ref nên không cần
// memo hóa ở component — listener chỉ gắn/gỡ theo eventName và enabled.
export function useSocketEvent<E extends EventName>(
  eventName: E,
  handler: (payload: PayloadOf<E>) => void,
  enabled = true
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    let socket = getSocket();
    let listener: ((payload: PayloadOf<E>) => void) | null = null;

    const setup = () => {
      socket = getSocket();
      if (!socket) return;

      listener = (payload: PayloadOf<E>) => handlerRef.current(payload);
      socket.on(eventName, listener as never);
    };

    if (socket) {
      setup();
    } else {
      window.addEventListener('socket_initialized', setup, { once: true });
    }

    return () => {
      if (socket && listener) {
        socket.off(eventName, listener as never);
      }
      window.removeEventListener('socket_initialized', setup);
    };
  }, [eventName, enabled]);
}
