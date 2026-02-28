const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

test.describe('Patterm Electron Tests', () => {
    let electronApp;
    let window;

    test.beforeAll(async () => {
        // Launch Electron app
        electronApp = await electron.launch({
            args: [path.join(__dirname, '../src/main/main.js')]
        });
        
        // Wait for the main window to be ready
        window = await electronApp.firstWindow();
    });

    test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test('application should start and show main elements', async () => {
        // Wait for DOM to load
        await window.waitForLoadState('domcontentloaded');
        
        // Verify Title
        const title = await window.title();
        expect(title).toBe('Patterm - Serial Terminal');
        
        // Verify toolbar elements
        await expect(window.locator('#new-tab-btn')).toBeVisible();
        await expect(window.locator('#theme-toggle-btn')).toBeVisible();
        
        // Verify initial empty state
        await expect(window.locator('#empty-state')).toBeVisible();
        await expect(window.locator('text=No Connections')).toBeVisible();
        
        // Verify initial layout
        const tabContentDisplay = await window.locator('#tabs-content').evaluate(el => window.getComputedStyle(el).display);
        expect(tabContentDisplay).toBe('none'); // Should be hidden initially
    });
    
    test('theme toggle should change attributes', async () => {
        const themeBtn = window.locator('#theme-toggle-btn');
        const rootHtml = window.locator('html');
        
        // Initial theme should be set (usually system/dark/light)
        const initialTheme = await rootHtml.getAttribute('data-theme');
        expect(initialTheme).toBeTruthy();
        
        // Click theme toggle
        await themeBtn.click();
        
        // Let event propagate
        await window.waitForTimeout(500);
        
        // Verify theme changed
        const newTheme = await rootHtml.getAttribute('data-theme');
        expect(newTheme).not.toBe(initialTheme);
    });
});
