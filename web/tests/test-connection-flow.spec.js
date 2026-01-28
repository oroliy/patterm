import { test, expect } from '@playwright/test';

test('debug full connection flow with simulated port', async ({ page }) => {
    const consoleLogs = [];
    const errors = [];

    page.on('console', msg => {
        const text = msg.text();
        console.log('[Browser Console]', text);
        consoleLogs.push(text);
    });

    page.on('pageerror', error => {
        console.error('[Browser Error]', error.message);
        errors.push(error);
    });

    await page.goto('https://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n=== STEP 1: Click new connection ===');
    await page.click('#new-tab-btn');
    await page.waitForTimeout(500);

    const dialogVisible = await page.locator('.connection-dialog').isVisible();
    console.log('Dialog visible:', dialogVisible);

    console.log('\n=== STEP 2: Inject mock port and click connect ===');

    // Inject a mock serial port and trigger connection
    const result = await page.evaluate(async () => {
        // Create a proper mock port object
        const mockPort = {
            getInfo: () => ({ usbVendorId: 0x1234, usbProductId: 0x5678 }),
            opened: false,
            readable: null,
            writable: null,

            async open(options) {
                console.log('[MockPort] Opening with:', options);
                this.opened = true;
                this.readable = new ReadableStream({
                    start(controller) {
                        console.log('[MockPort] ReadableStream started');
                        // Simulate no data
                    }
                });
                this.writable = new WritableStream();
                return new Promise(resolve => setTimeout(resolve, 100));
            },

            async close() {
                console.log('[MockPort] Closing');
                this.opened = false;
                return new Promise(resolve => setTimeout(resolve, 100));
            }
        };

        // Get reference to dialog elements
        const selectBtn = document.getElementById('select-port-btn');
        const connectBtn = document.getElementById('connect-btn');

        if (!selectBtn || !connectBtn) {
            return { error: 'Dialog buttons not found', dialogExists: !!document.querySelector('.connection-dialog') };
        }

        // Store the mock port globally for debugging
        window.debugMockPort = mockPort;

        // Override selectPort to use our mock
        const selectBtnClone = selectBtn.cloneNode(true);
        selectBtn.parentNode.replaceChild(selectBtnClone, selectBtn);

        selectBtnClone.addEventListener('click', async () => {
            console.log('[Test] Simulating port selection');
            window.debugSelectedPort = mockPort;

            // Enable connect button
            const connectBtn = document.getElementById('connect-btn');
            connectBtn.disabled = false;

            // Show "selected" state
            const infoSpan = document.getElementById('selected-port-info');
            infoSpan.textContent = 'Mock: USB VID:PID 1234:5678';
            infoSpan.classList.add('port-selected');
        });

        // Now click connect
        connectBtn.disabled = false;
        connectBtn.click();

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check results
        const tabsContainer = document.getElementById('tabs-container');
        const tabsCount = tabsContainer ? tabsContainer.querySelectorAll('.tab').length : 0;
        const emptyState = document.getElementById('empty-state');
        const emptyStateHidden = emptyState ? window.getComputedStyle(emptyState).display === 'none' : false;

        return {
            tabsCount,
            emptyStateHidden,
            dialogExists: !!document.querySelector('.connection-dialog'),
            errorOverlay: !!document.querySelector('.error-overlay')
        };
    });

    console.log('Injection result:', JSON.stringify(result, null, 2));

    await page.waitForTimeout(2000);

    console.log('\n=== FINAL STATE ===');
    console.log('Tabs created:', result.tabsCount);
    console.log('Empty state hidden:', result.emptyStateHidden);
    console.log('Dialog still exists:', result.dialogExists);
    console.log('Error overlay:', result.errorOverlay);

    console.log('\n=== ALL RELEVANT CONSOLE LOGS ===');
    const relevantLogs = consoleLogs.filter(l =>
        l.includes('[App]') ||
        l.includes('[ConnectionDialog]') ||
        l.includes('[MockPort]') ||
        l.includes('[TabManager]') ||
        l.includes('[SerialService]') ||
        l.includes('[Test]') ||
        l.includes('Error') ||
        l.includes('error')
    );
    relevantLogs.forEach(l => console.log(l));

    console.log('\n=== ERRORS ===');
    errors.forEach(e => console.log('-', e.message, e.stack?.split('\n')[0]));

    await page.screenshot({ path: 'test-output/after-simulated-connect.png' });
    console.log('\nScreenshot saved to test-output/after-simulated-connect.png');
});
