import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// docs/conventions/03-testing.md — jsdom cho component test; tách `environment: 'node'` riêng
// khi có nhu cầu test pure util không cần DOM (chưa cần ngay, thêm sau khi có ví dụ thật).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup/vitest-setup.ts'],
    include: ['test/**/*.spec.{ts,tsx}'],
  },
});
