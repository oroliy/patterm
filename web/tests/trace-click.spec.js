import { test, expect } from '@playwright/test';

test('trace what happens when connect is clicked (without port)', async ({ page }) => {
    const consoleLogs = [];

    page.on('console', msg => {
        consoleLogs.push(msg.text());
    });

    await page.goto('https://localhost:5173/');
    await page.waitForLoadState('networkidle');

    console.log('\n=== Opening dialog ===');
    await page.click('#new-tab-btn');
    await page.waitForTimeout(500);

    const dialogBefore = page.locator('.connection-dialog');
    const isVisibleBefore = await dialogBefore.isVisible();
    console.log('Dialog visible before:', isVisibleBefore);

    // Check connect button state
    const connectBtn = page.locator('#connect-btn');
    const isDisabledBefore = await connectBtn.isDisabled();
    console.log('Connect button disabled:', isDisabledBefore);

    // Check if dialog error is visible
    const dialogError = page.locator('.connection-dialog #dialog-error');
    const errorVisibleBefore = await dialogError.isVisible();
    console.log('Dialog error visible before:', errorVisibleBefore);

    // Force enable the button and click it (simulating port selected)
    console.log('\n=== Force enabling button and clicking ===');
    await page.evaluate(() => {
        const btn = document.getElementById('connect-btn');
        btn.disabled = false;
    });

    // Check button state
    const isDisabledAfter = await connectBtn.isDisabled();
    console.log('Connect button disabled after enable:', isDisabledAfter);

    // Click it
    await page.click('#connect-btn');
    await page.waitForTimeout(1000);

    // Check dialog state after click
    const dialogAfter = page.locator('.connection-dialog');
    const isVisibleAfter = await dialogAfter.isVisible();
    console.log('Dialog visible after click:', isVisibleAfter);

    const errorVisibleAfter = await dialogError.isVisible();
    console.log('Dialog error visible after:', errorVisibleAfter);

    if (errorVisibleAfter) {
        const errorText = await dialogError.textContent();
        console.log('Dialog error text:', errorText);
    }

    // Check for any error overlay
    const errorOverlay = page.locator('.error-overlay');
    const hasErrorOverlay = await errorOverlay.count() > 0;
    console.log('Error overlay exists:', hasErrorOverlay);

    if (hasErrorOverlay) {
        const overlayText = await errorOverlay.locator('.error-dialog').textContent();
        console.log('Error overlay text:', overlayText.substring(0, 200));
    }

    // Dump relevant logs
    console.log('\n=== Relevant console logs ===');
    consoleLogs.filter(l =>
        l.includes('[App]') ||
        l.includes('[ConnectionDialog]') ||
        l.includes('Failed') ||
        l.includes('Error') ||
        l.includes('error')
    ).forEach(l => console.log(l));

    await page.screenshot({ path: 'test-output/after-force-click.png' });
});
