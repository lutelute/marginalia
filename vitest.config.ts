import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 純粋関数 + Node モジュールのテストが中心なので node 環境
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'packages/**/src/**/*.{test,spec}.{ts,tsx}',
      'electron/**/*.{test,spec}.{js,mjs}',
    ],
  },
});
