import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './frontend',
  use: {
    baseURL: 'http://localhost:5173',
  },
});
