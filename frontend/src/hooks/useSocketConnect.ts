import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';

// Gọi handler mỗi khi socket (re)connect. Dùng để refresh dữ liệu bù
// event đã miss lúc offline — backend không persist event chưa deliver.
export function useSocketConnect(handler: () => void, enabled = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    if (!socket) return;

    const listener = () => handlerRef.current();
    socket.on('connect', listener);
    return () => {
      socket.off('connect', listener);
    };
  }, [enabled]);
}
