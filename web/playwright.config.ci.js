import { defineConfig } from '@playwright/test';
import {
    chromiumProject,
    defaultWebServer,
    httpsUse,
    testDir,
} from './playwright.config.base.js';

export default defineConfig({
    testDir,
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1,
    reporter: 'line',
    use: {
        ...httpsUse,
        trace: 'off',
        screenshot: 'on',
    },
    projects: [chromiumProject],
    webServer: defaultWebServer,
});
