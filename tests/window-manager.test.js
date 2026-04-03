const mockBrowserWindow = jest.fn();

jest.mock('electron', () => ({
    BrowserWindow: jest.fn((options) => mockBrowserWindow(options)),
}));

describe('WindowManager', () => {
    beforeEach(() => {
        jest.resetModules();
        mockBrowserWindow.mockReset();
    });

    test('createMainWindow wires lifecycle handlers and stores window', () => {
        const once = jest.fn();
        const on = jest.fn();
        const show = jest.fn();
        const executeJavaScript = jest.fn(async () => ({ toolbarHeight: 50, tabsHeight: 40 }));
        const window = {
            once,
            on,
            show,
            webContents: { executeJavaScript },
            getContentBounds: () => ({ width: 1200, height: 800 }),
        };
        mockBrowserWindow.mockReturnValue(window);

        const WindowManager = require('../apps/desktop/main/window-manager');
        const manager = new WindowManager();

        expect(manager.createMainWindow()).toBe(window);
        expect(manager.getMainWindow()).toBe(window);
        expect(once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
        expect(on).toHaveBeenCalledWith('closed', expect.any(Function));
    });

    test('closeAll clears the window reference and broadcastToTabs is a no-op', () => {
        const window = {
            once: jest.fn(),
            on: jest.fn(),
            show: jest.fn(),
            webContents: {},
        };

        mockBrowserWindow.mockReturnValue(window);

        const WindowManager = require('../apps/desktop/main/window-manager');
        const manager = new WindowManager({
            log: jest.fn(),
        });
        manager.createMainWindow();
        expect(() => manager.broadcastToTabs('theme:update', 'dark', 'claude')).not.toThrow();

        manager.closeAll();
        expect(manager.getMainWindow()).toBeNull();
    });
});
