// Origin được phép gọi API/socket. CORS_ORIGINS (phân tách bằng dấu phẩy) nếu có;
// nếu không thì FRONTEND_URL + Vite dev server. Bỏ "/" cuối vì header Origin không có.
export function getAllowedOrigins(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const configured = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',')
    : [env.FRONTEND_URL ?? '', 'http://localhost:5173'];
  const origins = configured
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return Array.from(new Set(origins));
}
