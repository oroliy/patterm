const mockBrowserWindow = jest.fn();
const mockBrowserView = jest.fn();

jest.mock('electron', () => ({
    BrowserWindow: jest.fn((options) => mockBrowserWindow(options)),
    BrowserView: jest.fn((options) => mockBrowserView(options)),
}));

describe('WindowManager', () => {
    beforeEach(() => {
        jest.resetModules();
        mockBrowserWindow.mockReset();
        mockBrowserView.mockReset();
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

        const WindowManager = require('../src/main/window-manager');
        const manager = new WindowManager();

        expect(manager.createMainWindow()).toBe(window);
        expect(manager.getMainWindow()).toBe(window);
        expect(once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
        expect(on).toHaveBeenCalledWith('closed', expect.any(Function));
        expect(on).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    test('createNewTab and switchTab set bounds and activate the view', async () => {
        const addBrowserView = jest.fn();
        const setTopBrowserView = jest.fn();
        const removeBrowserView = jest.fn();
        const window = {
            once: jest.fn(),
            on: jest.fn(),
            show: jest.fn(),
            addBrowserView,
            setTopBrowserView,
            removeBrowserView,
            webContents: {
                executeJavaScript: jest.fn(async () => ({ toolbarHeight: 50, tabsHeight: 40 })),
            },
            getContentBounds: () => ({ width: 1200, height: 800, y: 10 }),
        };
        const setBounds = jest.fn();
        const getBounds = jest.fn(() => ({ x: 0, y: 90, width: 1200, height: 710 }));
        const view = {
            setBounds,
            getBounds,
            webContents: {
                loadFile: jest.fn(),
                on: jest.fn((event, callback) => {
                    if (event === 'did-finish-load') {
                        callback();
                    }
                }),
                send: jest.fn(),
                executeJavaScript: jest.fn(async () => ({ bodyHeight: 100 })),
                openDevTools: jest.fn(),
                isDestroyed: jest.fn(() => false),
                destroy: jest.fn(),
            },
        };

        mockBrowserWindow.mockReturnValue(window);
        mockBrowserView.mockReturnValue(view);

        const WindowManager = require('../src/main/window-manager');
        const manager = new WindowManager();
        manager.createMainWindow();

        const createPromise = manager.createNewTab(1, 'Port 1');
        const created = await createPromise;

        expect(created).toEqual({ id: 1, title: 'Port 1', shouldActivate: true });
        expect(setBounds).toHaveBeenCalled();

        const switched = await manager.switchTab(1);
        expect(switched).toBe(true);
        expect(addBrowserView).toHaveBeenCalledWith(view);
        expect(setTopBrowserView).toHaveBeenCalledWith(view);

        manager.closeAll();
        expect(view.webContents.destroy).toHaveBeenCalled();
        expect(manager.getActiveTab()).toBeUndefined();
    });
});
