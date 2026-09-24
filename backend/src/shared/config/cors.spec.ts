import { getAllowedOrigins } from './cors';

describe('getAllowedOrigins', () => {
  it('uses CORS_ORIGINS when set, trimming spaces and trailing slashes', () => {
    expect(
      getAllowedOrigins({
        CORS_ORIGINS: 'https://a.app/, https://b.app ',
        FRONTEND_URL: 'https://x.app',
      }),
    ).toEqual(['https://a.app', 'https://b.app']);
  });

  it('falls back to FRONTEND_URL plus the Vite dev server', () => {
    expect(
      getAllowedOrigins({ FRONTEND_URL: 'https://baby-chat-rho.vercel.app/' }),
    ).toEqual(['https://baby-chat-rho.vercel.app', 'http://localhost:5173']);
  });

  it('never returns an empty origin', () => {
    expect(getAllowedOrigins({})).toEqual(['http://localhost:5173']);
  });
});
