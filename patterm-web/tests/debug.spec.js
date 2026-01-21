import { test, expect } from '@playwright/test';

test.describe('Patterm Web - Connection Flow Debug', () => {
    test('should trace connection dialog flow', async ({ page, context }) => {
        // Capture console logs
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push({
                type: msg.type(),
                text: msg.text(),
                location: msg.location()
            });
        });

        // Capture uncaught errors
        const errors = [];
        page.on('pageerror', error => {
            errors.push({
                message: error.message,
                stack: error.stack
            });
        });

        // Navigate to the app
        await page.goto('/');

        // Wait for page to load
        await expect(page.locator('.app-container')).toBeVisible();

        console.log('=== Page loaded ===');

        // Click new connection button
        await page.click('#new-tab-btn');
        await expect(page.locator('.connection-dialog')).toBeVisible();

        console.log('=== Connection dialog opened ===');

        // Get current console logs
        const initialLogs = consoleLogs.filter(log =>
            log.text.includes('[App]') ||
            log.text.includes('[EventManager]') ||
            log.text.includes('[ConnectionDialog]')
        );
        console.log('Initial console logs:', initialLogs.map(l => l.text));

        // Try to click connect without selecting port
        const connectBtn = page.locator('#connect-btn');
        await expect(connectBtn).toBeDisabled();

        console.log('=== Connect button is disabled (expected) ===');

        // Check if Select Port button exists
        const selectPortBtn = page.locator('#select-port-btn');
        await expect(selectPortBtn).toBeVisible();

        console.log('=== Select Port button is visible ===');

        // Check dialog elements
        const baudRateSelect = page.locator('#baud-rate');
        await expect(baudRateSelect).toBeVisible();
        const baudRateValue = await baudRateSelect.inputValue();
        console.log('=== Baud rate:', baudRateValue, '===');

        // Check for empty state
        const emptyState = page.locator('#empty-state');
        await expect(emptyState).toBeVisible();
        console.log('=== Empty state is visible ===');

        // Check tabs container
        const tabsContainer = page.locator('#tabs-container');
        const tabsCount = await tabsContainer.locator('.tab').count();
        console.log('=== Current tabs count:', tabsCount, '===');

        // Print all console logs
        console.log('\n=== All Console Logs ===');
        consoleLogs.forEach(log => {
            console.log(`[${log.type}] ${log.text}`);
        });

        // Print any errors
        if (errors.length > 0) {
            console.log('\n=== Errors ===');
            errors.forEach(err => {
                console.log('Error:', err.message);
                console.log('Stack:', err.stack);
            });
        }

        // Take screenshot
        await page.screenshot({ path: 'debug-connection-dialog.png' });

        console.log('\n=== Screenshot saved ===');
    });

    test('should inspect app initialization', async ({ page }) => {
        const consoleLogs = [];

        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('App') || text.includes('EventManager') || text.includes('TabManager')) {
                consoleLogs.push(text);
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        console.log('\n=== App Initialization Logs ===');
        consoleLogs.forEach(log => console.log(log));

        // Check if Service Worker registered
        await page.waitForTimeout(2000);
        const swLogs = consoleLogs.filter(l => l.includes('SW'));
        console.log('\n=== Service Worker Logs ===');
        swLogs.forEach(log => console.log(log));

        // Check DOM structure
        const tabsContainer = page.locator('#tabs-container');
        const emptyState = page.locator('#empty-state');

        console.log('\n=== DOM Structure ===');
        console.log('Tabs container exists:', await tabsContainer.count() > 0);
        console.log('Empty state exists:', await emptyState.count() > 0);
        console.log('Empty state visible:', await emptyState.isVisible());
        console.log('New tab button exists:', await page.locator('#new-tab-btn').count() > 0);
    });

    test('should check event listener registration', async ({ page }) => {
        const consoleLogs = [];

        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
        });

        await page.goto('/');

        // Wait for initialization
        await page.waitForTimeout(1000);

        console.log('\n=== Event Registration Logs ===');
        const eventLogs = consoleLogs.filter(l => l.includes('EventManager'));
        eventLogs.forEach(log => console.log(log));

        // Verify event listeners were registered
        const registeredEvents = eventLogs.filter(l => l.includes('Registered callback'));
        console.log('\n=== Registered Event Count:', registeredEvents.length, '===');
        registeredEvents.forEach(log => {
            const match = log.match(/Registered callback for event: (\w+)/);
            if (match) {
                console.log(`  - ${match[1]}`);
            }
        });
    });

    test('should test dialog creation and destruction', async ({ page }) => {
        const consoleLogs = [];

        page.on('console', msg => {
            consoleLogs.push(msg.text());
        });

        await page.goto('/');

        // Open and close dialog multiple times
        for (let i = 0; i < 3; i++) {
            console.log(`\n=== Iteration ${i + 1} ===`);

            // Open dialog
            await page.click('#new-tab-btn');
            await expect(page.locator('.connection-dialog')).toBeVisible();

            // Close dialog
            await page.keyboard.press('Escape');
            await expect(page.locator('.connection-dialog')).not.toBeVisible();

            await page.waitForTimeout(100);
        }

        console.log('\n=== Dialog Cycle Logs ===');
        const relevantLogs = consoleLogs.filter(l =>
            l.includes('ConnectionDialog') || l.includes('dialog')
        );
        relevantLogs.forEach(log => console.log(log));
    });
});
