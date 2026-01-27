
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      "**/e2e/**",
      "**/playwright-report/**",
      "**/.worktrees/**",
      "**/.worktree/**"
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'lib/core/**',
        'lib/features/**',
        'app/api/**',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
    globalSetup: './tests/setup/global.ts',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    },
  },
});
