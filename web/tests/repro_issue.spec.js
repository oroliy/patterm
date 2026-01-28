import { test, expect } from '@playwright/test';

test('repro display issue', async ({ page }) => {
    await page.goto('https://localhost:5173/');

    // Create a tab programmatically to bypass serial port selection
    await page.evaluate(() => {
        const config = { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' };
        window.app.createConnection(config, 'Test Tab', {
            // Mock port
            open: async () => {},
            close: async () => {},
            readable: { getReader: () => ({ read: async () => ({ value: null, done: false }), releaseLock: () => {} }) },
            writable: { getWriter: () => ({ write: async () => {}, releaseLock: () => {} }) },
            addEventListener: () => {},
            removeEventListener: () => {}
        });
    });
    
    // Wait a bit for layout
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-output/repro-display.png' });
});
