import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './electron-tests',
    timeout: 30000,
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    expect: {
        timeout: 5000
    },
    reporter: 'list',
    use: {
        trace: 'on-first-retry',
    },
});
