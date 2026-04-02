import { defineConfig } from '@playwright/test';
import {
    chromiumProject,
    defaultWebServer,
    httpsUse,
    testDir,
} from './playwright.config.base.js';

export default defineConfig({
    testDir,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    use: {
        ...httpsUse,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [chromiumProject],
    webServer: defaultWebServer,
});
