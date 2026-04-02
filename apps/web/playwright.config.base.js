import { devices } from '@playwright/test';

export const testDir = './tests';

export const chromiumProject = {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
};

export const defaultWebServer = {
    command: 'exec npx vite --port 5173',
    url: 'https://localhost:5173',
    ignoreHTTPSErrors: true,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
};

export const httpsUse = {
    ignoreHTTPSErrors: true,
};
