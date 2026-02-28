const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('Patterm Electron - Serial Interactions', () => {
    let electronApp;
    let window;

    test.beforeAll(async () => {
        // Launch Electron app
        electronApp = await electron.launch({
            args: [path.join(__dirname, '../src/main/main.js')]
        });
        
        window = await electronApp.firstWindow();
        await window.waitForLoadState('domcontentloaded');
    });

    test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test('should open connection dialog and list ports', async () => {
        // Mock the IPC response for listing ports before we open the dialog
        await electronApp.evaluate(({ ipcMain }) => {
            ipcMain.removeHandler('serial:listPorts');
            ipcMain.handle('serial:listPorts', () => [
                { path: '/dev/ttyUSB0', manufacturer: 'FTDI' },
                { path: '/dev/ttyUSB1', manufacturer: 'CH340' }
            ]);
        });
        
        // Click new connection button
        await window.click('#new-tab-btn');
        
        // Wait for dialog overlay
        const dialog = window.locator('.dialog-overlay').first();
        await expect(dialog).toBeVisible();
        
        // Wait for port select to populate
        const portSelect = window.locator('#port-select').first();
        await expect(portSelect).toBeVisible();
        
        // Verify mock options were loaded (plus the empty/placeholder option)
        const optionsCount = await portSelect.locator('option').count();
        expect(optionsCount).toBe(2);
        
        // Verify content
        const firstPortText = await portSelect.locator('option').nth(0).textContent();
        expect(firstPortText).toContain('/dev/ttyUSB0');
        
        // Cancel to clean up
        await window.click('#cancel-btn');
        await expect(dialog).not.toBeVisible();
    });
});
