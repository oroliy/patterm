import { test, expect } from '@playwright/test';

test('simple debug test - app loads', async ({ page }) => {
    // Log all console messages
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push({
            type: msg.type(),
            text: msg.text()
        });
    });

    // Log all errors
    const errors = [];
    page.on('pageerror', error => {
        errors.push(error.message);
    });

    // Navigate to app
    await page.goto('https://localhost:5173/', {
        timeout: 30000
    });

    // Wait for page load
    await page.waitForLoadState('networkidle');

    console.log('\n=== Page loaded successfully ===');

    // Check main elements
    const appContainer = page.locator('.app-container');
    await expect(appContainer).toBeVisible();

    const emptyState = page.locator('#empty-state');
    await expect(emptyState).toBeVisible();

    const newTabBtn = page.locator('#new-tab-btn');
    await expect(newTabBtn).toBeVisible();

    console.log('=== Main elements verified ===');

    // Print console logs
    console.log('\n=== Console Logs (' + consoleLogs.length + ' total) ===');
    const importantLogs = consoleLogs.filter(l =>
        l.text.includes('[App]') ||
        l.text.includes('[EventManager]') ||
        l.text.includes('[TabManager]') ||
        l.text.includes('[SW]') ||
        l.text.includes('error') ||
        l.text.includes('Error')
    );
    importantLogs.forEach(l => {
        console.log(`[${l.type}] ${l.text}`);
    });

    // Print errors
    if (errors.length > 0) {
        console.log('\n=== Page Errors ===');
        errors.forEach(e => console.log(e));
    }

    // Test opening connection dialog
    await newTabBtn.click();
    await page.waitForTimeout(500);

    const dialog = page.locator('.connection-dialog');
    const isDialogVisible = await dialog.isVisible();

    console.log('\n=== Connection Dialog visible: ' + isDialogVisible + ' ===');

    if (isDialogVisible) {
        // Check dialog elements
        const selectPortBtn = page.locator('#select-port-btn');
        const connectBtn = page.locator('#connect-btn');

        console.log('Select Port button visible:', await selectPortBtn.isVisible());
        console.log('Connect button visible:', await connectBtn.isVisible());
        console.log('Connect button disabled:', await connectBtn.isDisabled());

        // Get any new console logs after dialog opened
        const dialogLogs = consoleLogs.filter(l =>
            l.text.includes('[ConnectionDialog]')
        );
        console.log('\n=== Dialog Logs ===');
        dialogLogs.forEach(l => console.log(l.text));
    }

    // Take screenshot
    await page.screenshot({ path: 'test-output/simple-test.png' });
    console.log('\n=== Screenshot saved to test-output/simple-test.png ===');

    // Clean up - close dialog
    if (isDialogVisible) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
    }
});
