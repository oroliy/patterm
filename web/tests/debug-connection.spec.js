import { test, expect } from '@playwright/test';

test('debug connection flow - simulate port selection', async ({ page }) => {
    const consoleLogs = [];
    const errors = [];

    page.on('console', msg => {
        consoleLogs.push({
            type: msg.type(),
            text: msg.text()
        });
    });

    page.on('pageerror', error => {
        errors.push(error);
    });

    await page.goto('https://localhost:5173/');
    await page.waitForLoadState('networkidle');

    console.log('\n=== STEP 1: Page loaded ===');
    const initialLogs = consoleLogs.filter(l => l.text.includes('[App]') || l.text.includes('[EventManager]'));
    initialLogs.forEach(l => console.log(`  [${l.type}] ${l.text}`));

    // Click new connection
    await page.click('#new-tab-btn');
    await page.waitForTimeout(500);

    console.log('\n=== STEP 2: Connection dialog opened ===');

    // Check dialog exists
    const dialog = page.locator('.connection-dialog');
    await expect(dialog).toBeVisible();

    // Get dialog internal state by checking in browser
    const dialogState = await page.evaluate(() => {
        const selectBtn = document.getElementById('select-port-btn');
        const connectBtn = document.getElementById('connect-btn');
        const errorDiv = document.getElementById('dialog-error');
        return {
            selectBtnExists: !!selectBtn,
            selectBtnDisabled: selectBtn?.disabled,
            connectBtnExists: !!connectBtn,
            connectBtnDisabled: connectBtn?.disabled,
            errorVisible: errorDiv ? window.getComputedStyle(errorDiv).display !== 'none' : false,
            errorText: errorDiv?.textContent || ''
        };
    });

    console.log('  Dialog state:', JSON.stringify(dialogState, null, 2));

    // Simulate what would happen if port was selected
    // We'll inject a mock port and see what happens
    console.log('\n=== STEP 3: Simulating port selection ===');

    const mockResult = await page.evaluate(() => {
        // Create a mock port object
        const mockPort = {
            getInfo: () => ({ usbVendorId: 0x1234, usbProductId: 0x5678 }),
            open: async (options) => {
                console.log('[MockPort] Opening with options:', options);
                return Promise.resolve();
            },
            readable: null,
            writable: null
        };

        // Try to manually trigger the connection flow
        const dialogEl = document.querySelector('.connection-dialog');
        if (!dialogEl) return { error: 'Dialog not found' };

        // Find the ConnectionDialog instance if it exists
        // Actually, we can't access the instance from page context directly
        // So let's just check what the button click handler would do

        const connectBtn = document.getElementById('connect-btn');
        if (!connectBtn) return { error: 'Connect button not found' };

        // Enable the button
        connectBtn.disabled = false;

        // Get all event listeners
        const listeners = getEventListeners ? getEventListeners(connectBtn) : null;

        return {
            buttonEnabled: !connectBtn.disabled,
            hasClickListener: listeners && listeners.click ? listeners.click.length : 0,
            dialogExists: !!dialogEl
        };
    });

    console.log('  Mock result:', JSON.stringify(mockResult, null, 2));

    // Now click the connect button to see what happens
    console.log('\n=== STEP 4: Clicking connect button (should fail - no port) ===');

    const beforeClickCount = consoleLogs.length;
    await page.click('#connect-btn');
    await page.waitForTimeout(1000);

    const newLogs = consoleLogs.slice(beforeClickCount);
    console.log('  New logs after clicking connect:');
    newLogs.forEach(l => console.log(`    [${l.type}] ${l.text}`));

    // Check if error dialog appeared
    const errorDialog = page.locator('.error-overlay');
    const hasErrorDialog = await errorDialog.count() > 0;
    console.log('  Error dialog appeared:', hasErrorDialog);

    if (hasErrorDialog) {
        const errorText = await errorDialog.locator('.error-dialog').textContent();
        console.log('  Error text:', errorText);
    }

    // Check if dialog is still visible or closed
    const dialogStillVisible = await dialog.isVisible();
    console.log('  Dialog still visible:', dialogStillVisible);

    // Check if any tabs were created
    const tabsCount = await page.locator('#tabs-container .tab').count();
    console.log('  Number of tabs:', tabsCount);

    // Check if empty state is hidden
    const emptyStateHidden = await page.locator('#empty-state').isHidden();
    console.log('  Empty state hidden:', emptyStateHidden);

    // Final summary
    console.log('\n=== FINAL STATE ===');
    console.log('  Dialog visible:', dialogStillVisible);
    console.log('  Tabs created:', tabsCount);
    console.log('  Errors:', errors.length);
    errors.forEach(e => console.log('    -', e.message));

    await page.screenshot({ path: 'test-output/after-connect-click.png' });

    // Full console dump
    console.log('\n=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach(l => {
        if (l.text.includes('App') || l.text.includes('ConnectionDialog') ||
            l.text.includes('TabManager') || l.text.includes('SerialService') ||
            l.text.includes('Error') || l.text.includes('error') ||
            l.text.includes('Failed')) {
            console.log(`  [${l.type}] ${l.text}`);
        }
    });
});

test('check JavaScript errors and unhandled rejections', async ({ page }) => {
    const errors = [];

    page.on('pageerror', error => errors.push(error));
    page.on('console', msg => {
        if (msg.type() === 'error') {
            errors.push(new Error(msg.text()));
        }
    });

    await page.goto('https://localhost:5173/');
    await page.waitForLoadState('networkidle');

    // Try to do various actions
    await page.click('#new-tab-btn');
    await page.waitForTimeout(500);
    await page.click('#connect-btn');  // Should show error
    await page.waitForTimeout(1000);

    console.log('\n=== Errors found:', errors.length, '===');
    errors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err.message}`);
        if (err.stack) {
            const stackLines = err.stack.split('\n').slice(0, 3);
            stackLines.forEach(line => console.log(`     ${line}`));
        }
    });
});
