import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'playwright-report/**', 'test-results/**', 'dist/**', 'node_modules/**'],
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
