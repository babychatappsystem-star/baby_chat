import { useEffect, useState } from 'react';

// < 768px (breakpoint md của antd). Đọc matchMedia ngay lần render đầu để desktop
// không nháy qua layout mobile như Grid.useBreakpoint (trả {} ở render đầu).
const QUERY = '(max-width: 767.98px)';

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}
