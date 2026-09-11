const audio = new Audio('/sounds/notification.wav');
audio.preload = 'auto';

export const isSoundMuted = (): boolean =>
  localStorage.getItem('sound_muted') === 'true';

export const toggleSound = (): boolean => {
  const next = !isSoundMuted();
  localStorage.setItem('sound_muted', String(next));
  return next; // true = muted
};

export const playNotificationSound = (): void => {
  if (isSoundMuted()) return;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Bỏ qua lỗi autoplay policy của browser
  });
};
