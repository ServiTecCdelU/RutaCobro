import { defineConfig } from 'vitest/config';

// Config aislada para el backend (Node, sin jsdom ni el setup del frontend).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.js'],
  },
});
