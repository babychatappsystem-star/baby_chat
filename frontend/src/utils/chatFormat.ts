import dayjs from 'dayjs';

// Thời gian hiển thị trong danh sách hội thoại: càng cũ càng ít chi tiết.
// Hôm nay "14:05" · hôm qua "Yesterday" · 7 ngày "Mon" · cùng năm "12 Sep" · khác năm "12/09/25".
export function formatListTime(iso?: string, now: dayjs.Dayjs = dayjs()): string {
  if (!iso) return '';
  const t = dayjs(iso);
  if (!t.isValid()) return '';
  const days = now.startOf('day').diff(t.startOf('day'), 'day');
  if (days <= 0) return t.format('HH:mm');
  if (days === 1) return 'Yesterday';
  if (days < 7) return t.format('ddd');
  if (t.year() === now.year()) return t.format('D MMM');
  return t.format('DD/MM/YY');
}
