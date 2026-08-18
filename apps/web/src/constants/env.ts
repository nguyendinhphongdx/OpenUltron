import { env } from 'next-runtime-env';

/**
 * `NEXT_PUBLIC_*` đọc runtime (container env), KHÔNG bake lúc build —
 * `output: 'standalone'` (next.config.ts) + `<PublicEnvScript />` (app/layout.tsx)
 * là 2 điều kiện bắt buộc để `env()` đọc đúng giá trị. Single source of truth —
 * không gọi `env('NEXT_PUBLIC_...')` rải rác nơi khác.
 */
export const ENV = {
  apiBaseUrl: env('NEXT_PUBLIC_API_BASE_URL') ?? 'http://localhost:8000',
} as const;
