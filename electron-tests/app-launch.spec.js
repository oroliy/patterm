const { test, expect, _electron: electron } = require('@playwright/test');
const path = require('path');

async function launchElectronApp() {
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    return electron.launch({
        args: ['--no-sandbox', path.join(__dirname, '../apps/desktop/main/main.js')],
        env: {
            ...env,
            ELECTRON_DISABLE_SANDBOX: '1',
            PATTERM_E2E: '1',
            PATTERM_OPEN_DEVTOOLS: '0'
        }
    });
}

test.describe('Patterm Electron Tests', () => {
    let electronApp;
    let window;

    test.beforeAll(async () => {
        electronApp = await launchElectronApp();
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
    
    test('theme menu should switch between explicit modes', async () => {
        const themeBtn = window.locator('#theme-toggle-btn');
        const themeMenu = window.locator('#theme-menu');
        const rootHtml = window.locator('html');

        await window.waitForFunction(() => Boolean(document.documentElement.getAttribute('data-theme')));
        const initialTheme = await rootHtml.getAttribute('data-theme');
        expect(initialTheme).toBeTruthy();

        await themeBtn.evaluate((button) => button.click());
        await expect(themeMenu).toBeVisible();

        const targetMode = initialTheme === 'dark' ? 'light' : 'dark';
        await themeMenu.locator(`[data-theme-value="${targetMode}"]`).click();
        await window.waitForTimeout(200);

        const newTheme = await rootHtml.getAttribute('data-theme');
        expect(newTheme).toBe(targetMode);
        await expect(themeBtn).toHaveAttribute(
            'title',
            `Theme: ${targetMode === 'dark' ? 'Dark' : 'Light'} · Patterm Blue`
        );

        await expect(themeMenu).toBeVisible();
        await themeMenu.locator('[data-theme-variant="claude"]').click();
        await window.waitForTimeout(200);

        await expect(rootHtml).toHaveAttribute('data-theme-variant', 'claude');
        await expect(themeBtn).toHaveAttribute(
            'title',
            `Theme: ${targetMode === 'dark' ? 'Dark' : 'Light'} · Claude Canvas`
        );
    });
});
