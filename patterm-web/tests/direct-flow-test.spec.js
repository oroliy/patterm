import { test, expect } from '@playwright/test';

test('directly test app.createConnection with mock data', async ({ page }) => {
    const consoleLogs = [];
    const errors = [];

    page.on('console', msg => {
        console.log('[Browser]', msg.text());
        consoleLogs.push(msg.text());
    });

    page.on('pageerror', error => {
        console.error('[Browser Error]', error.message);
        errors.push(error);
    });

    await page.goto('https://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n=== STEP 1: Call createConnection directly with mock data ===');

    // Directly test the createConnection method by injecting code
    const result = await page.evaluate(async () => {
        // Create a mock port that implements the Web Serial API interface
        const mockPort = {
            getInfo: () => ({ usbVendorId: 0x1234, usbProductId: 0x5678 }),

            async open(options) {
                console.log('[MockPort.open] Called with options:', options);
                this.readable = new ReadableStream({
                    start(controller) {
                        console.log('[MockPort.readable] Stream started');
                        // Close immediately to simulate successful open but no data
                    }
                });
                this.writable = new WritableStream();
                this.connected = true;
            },

            async close() {
                console.log('[MockPort.close] Called');
                this.connected = false;
            }
        };

        // Get reference to the Patterm app
        const app = window.app;

        if (!app) {
            return { error: 'App not found' };
        }

        console.log('[Test] App found, calling createConnection with mock port');

        // Call createConnection directly with mock data
        try {
            const config = {
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            };

            await app.createConnection(config, 'Test Port', mockPort);

            // Wait a bit for async operations
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Check results
            const tabsContainer = document.getElementById('tabs-container');
            const tabsCount = tabsContainer ? tabsContainer.querySelectorAll('.tab').length : 0;
            const emptyState = document.getElementById('empty-state');
            const emptyStateHidden = emptyState ? window.getComputedStyle(emptyState).display === 'none' : false;

            return {
                success: true,
                tabsCount,
                emptyStateHidden,
                error: null
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                stack: error.stack
            };
        }
    });

    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    await page.waitForTimeout(2000);

    console.log('\n=== CONSOLE LOGS ===');
    const relevantLogs = consoleLogs.filter(l =>
        l.includes('[App]') ||
        l.includes('[Test]') ||
        l.includes('[MockPort]') ||
        l.includes('[TabManager]') ||
        l.includes('[SerialService]') ||
        l.includes('Error') ||
        l.includes('error')
    );
    relevantLogs.forEach(l => console.log(l));

    console.log('\n=== PAGE ERRORS ===');
    errors.forEach(e => {
        console.log('-', e.message);
        console.log('  Stack:', e.stack?.split('\n').slice(0, 3).join('\n'));
    });

    await page.screenshot({ path: 'test-output/direct-create-call.png' });
    console.log('\nScreenshot saved');
});
