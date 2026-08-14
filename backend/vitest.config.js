import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    // fileParallelism: false runs test files serially in one worker, preventing
    // concurrent DB migrations from colliding on pg_type
    fileParallelism: false,
    testTimeout: 30000,
  },
});
