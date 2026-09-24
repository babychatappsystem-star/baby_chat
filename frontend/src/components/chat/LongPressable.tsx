import React from 'react';
import { useLongPress } from '../../hooks/useLongPress';

// Bọc 1 phần tử để nhận thao tác nhấn giữ (dùng được trong vòng lặp render từng tin).
export const LongPressable: React.FC<{
  onLongPress: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ onLongPress, disabled, className, children }) => {
  const handlers = useLongPress(onLongPress);
  return (
    <div className={className} {...(disabled ? {} : handlers)}>
      {children}
    </div>
  );
};
