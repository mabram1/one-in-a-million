import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup/canvas-env.ts'],
    include: ['tests/**/*.test.ts'],
    // Characterization tests drive a real frame loop; give them room but keep CI honest.
    testTimeout: 20000,
  },
});
