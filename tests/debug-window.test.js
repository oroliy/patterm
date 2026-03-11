const mockBrowserWindow = jest.fn();

jest.mock('electron', () => ({
    BrowserWindow: jest.fn((options) => mockBrowserWindow(options)),
}));

describe('DebugWindow', () => {
    beforeEach(() => {
        jest.resetModules();
        mockBrowserWindow.mockReset();
    });

    test('open creates hidden window and close tears it down', () => {
        const once = jest.fn((event, callback) => {
            if (event === 'ready-to-show') {
                callback();
            }
        });
        const on = jest.fn();
        const show = jest.fn();
        const close = jest.fn();
        const focus = jest.fn();
        const loadFile = jest.fn();

        mockBrowserWindow.mockReturnValue({
            once,
            on,
            show,
            close,
            focus,
            loadFile,
        });

        const DebugWindow = require('../src/main/debug-window');
        const debugWindow = new DebugWindow();

        debugWindow.open();
        expect(loadFile).toHaveBeenCalled();
        expect(show).toHaveBeenCalled();
        expect(debugWindow.enabled).toBe(true);

        debugWindow.close();
        expect(close).toHaveBeenCalled();
        expect(debugWindow.enabled).toBe(false);
    });

    test('log buffers messages until window is available and flush sends them', () => {
        const send = jest.fn();
        mockBrowserWindow.mockReturnValue({
            once: jest.fn(),
            on: jest.fn(),
            show: jest.fn(),
            close: jest.fn(),
            focus: jest.fn(),
            loadFile: jest.fn(),
            isDestroyed: jest.fn(() => false),
            webContents: { send },
        });

        const DebugWindow = require('../src/main/debug-window');
        const debugWindow = new DebugWindow();

        debugWindow.log('queued');
        expect(debugWindow.messages).toHaveLength(1);

        debugWindow.enabled = true;
        debugWindow.window = {
            isDestroyed: jest.fn(() => false),
            webContents: { send },
        };
        debugWindow.flush();
        debugWindow.clear();

        expect(send).toHaveBeenCalledWith('debug:log', expect.objectContaining({ message: 'queued' }));
        expect(send).toHaveBeenCalledWith('debug:clear');
        expect(debugWindow.messages).toHaveLength(0);
    });
});
