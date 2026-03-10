import { test, expect } from '@playwright/test';

test.describe('Patterm Web - Connection UI', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript(() => {
            const createEchoPort = () => {
                let controller = null;

                return {
                    connected: false,
                    readable: null,
                    writable: null,
                    getInfo() {
                        return { usbVendorId: 0x1234, usbProductId: 0x5678 };
                    },
                    async open() {
                        this.connected = true;
                        this.readable = new ReadableStream({
                            start(streamController) {
                                controller = streamController;
                            },
                        });
                        this.writable = new WritableStream({
                            async write(chunk) {
                                const decoder = new TextDecoder();
                                const text = decoder.decode(chunk);
                                if (controller) {
                                    controller.enqueue(new TextEncoder().encode(`Echo: ${text}\n`));
                                }
                            },
                        });
                    },
                    async close() {
                        this.connected = false;
                        if (controller) {
                            controller.close();
                            controller = null;
                        }
                    },
                };
            };

            Object.defineProperty(navigator, 'serial', {
                configurable: true,
                value: {
                    async requestPort() {
                        return createEchoPort();
                    },
                },
            });
        });
    });

    test('connects through the dialog and renders the tab in the main window', async ({ page }) => {
        await page.goto('https://localhost:5173/');
        await page.waitForLoadState('networkidle');

        await page.click('#new-tab-btn');
        await expect(page.locator('.connection-dialog')).toBeVisible();

        await page.click('#select-port-btn');
        await expect(page.locator('#selected-port-info')).toContainText('USB VID:PID 1234:5678');

        const connectBtn = page.locator('#connect-btn');
        await expect(connectBtn).toBeEnabled();

        await connectBtn.click();

        await expect(page.locator('.connection-dialog')).not.toBeVisible();
        await expect(page.locator('#empty-state')).toBeHidden();
        await expect(page.locator('#tabs-container .tab')).toHaveCount(1);

        const activeTab = page.locator('.tab-content').filter({ has: page.locator('.input-field') }).first();
        await expect(activeTab).toBeVisible();
        await expect(activeTab.locator('.input-field')).toBeEnabled();
        await expect(activeTab.locator('.send-btn')).toBeEnabled();
    });

    test('shows transmitted and received data in the main terminal area', async ({ page }) => {
        await page.goto('https://localhost:5173/');
        await page.waitForLoadState('networkidle');

        await page.click('#new-tab-btn');
        await page.click('#select-port-btn');
        await page.click('#connect-btn');

        const activeTab = page.locator('.tab-content').filter({ has: page.locator('.input-field') }).first();
        await expect(activeTab).toBeVisible();

        const inputField = activeTab.locator('.input-field');
        await inputField.fill('AT');
        await activeTab.locator('.send-btn').click();

        const terminal = activeTab.locator('.terminal-display');
        await expect(terminal).toContainText('> AT');
        await expect(terminal).toContainText('Echo: AT');
    });
});
