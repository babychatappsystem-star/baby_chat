import { useCallback, useRef } from 'react';

const DELAY_MS = 500;
const MOVE_TOLERANCE_PX = 10;

// Nhấn giữ trên màn hình cảm ứng. Kéo/cuộn quá 10px thì huỷ để không mở nhầm khi cuộn.
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
      fired.current = false;
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        onLongPress();
      }, DELAY_MS);
    },
    [onLongPress],
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!start.current) return;
      const touch = e.touches[0];
      if (
        Math.abs(touch.clientX - start.current.x) > MOVE_TOLERANCE_PX ||
        Math.abs(touch.clientY - start.current.y) > MOVE_TOLERANCE_PX
      ) {
        cancel();
      }
    },
    [cancel],
  );

  // Sau khi đã mở (long-press), chặn "click" giả trình duyệt sinh ra khi nhấc ngón tay —
  // nếu không nó rơi vào lớp nền của bảng vừa mở và đóng bảng ngay lập tức.
  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (fired.current) e.preventDefault();
      fired.current = false;
      cancel();
    },
    [cancel],
  );

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: cancel };
}
