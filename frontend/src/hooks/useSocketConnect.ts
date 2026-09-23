import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';

// Gọi handler mỗi khi socket (re)connect. Dùng để refresh dữ liệu bù
// event đã miss lúc offline — backend không persist event chưa deliver.
export function useSocketConnect(handler: () => void, enabled = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    let socket = getSocket();
    let listener: (() => void) | null = null;

    const setup = () => {
      socket = getSocket();
      if (!socket) return;
      
      listener = () => handlerRef.current();
      socket.on('connect', listener);

      if (socket.connected) {
        listener();
      }
    };

    if (socket) {
      setup();
    } else {
      window.addEventListener('socket_initialized', setup, { once: true });
    }

    return () => {
      if (socket && listener) {
        socket.off('connect', listener);
      }
      window.removeEventListener('socket_initialized', setup);
    };
  }, [enabled]);
}
