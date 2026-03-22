const createBaseShell = () => class AppShell {
    constructor() {
        this.tabManager = {
            createTab: jest.fn(() => ({ id: 'tab-1' })),
            connectTab: jest.fn(() => Promise.resolve()),
            closeTab: jest.fn(),
            getTab: jest.fn(() => ({ connected: false })),
            disconnectTab: jest.fn(() => Promise.resolve()),
            reconnectTab: jest.fn(() => Promise.resolve()),
        };
        this.tabComponents = new Map();
    }

    async init() {
        return undefined;
    }

    clearTerminal() {}

    copyTabContent() {}
};

describe('electron renderer app', () => {
    beforeEach(() => {
        jest.resetModules();

        global.document = {
            createElement: jest.fn(() => ({
                className: '',
                innerHTML: '',
                style: {},
            })),
            body: {
                appendChild: jest.fn(),
            },
        };

        global.window = {
            electronAPI: {
                onNewConnection: jest.fn(),
                onThemeSet: jest.fn(),
                saveOutput: jest.fn(() => Promise.resolve(true)),
                getBuildInfo: jest.fn(() => Promise.resolve()),
                notifyThemeChanged: jest.fn(() => Promise.resolve(true)),
            },
        };

        jest.doMock('../src/shared/js/app/AppShell.js', () => ({
            AppShell: createBaseShell(),
        }));
        jest.doMock('../src/shared/js/serial/normalizeSerialConfig.js', () => ({
            normalizeSerialConfig: jest.fn((config) => config),
        }));
        jest.doMock('../src/renderer/ElectronConnectionDialog.js', () => ({
            ElectronConnectionDialog: jest.fn(),
        }));
        jest.doMock('../src/renderer/services/IpcSerialProvider.js', () => ({
            ElectronSerialProvider: jest.fn(),
        }));
    });

    test('injects a native save handler for shared terminal exports', async () => {
        const { PattermElectronApp } = require('../src/renderer/main.js');
        const app = new PattermElectronApp();
        const { electronAPI } = window;

        const save = app.getTabSaveHandler('tab-1');
        await expect(save('content', 'export.txt')).resolves.toBe(true);

        expect(electronAPI.saveOutput).toHaveBeenCalledWith('content', 'export.txt');
    });

    test('loads about build info through IPC', async () => {
        const { PattermElectronApp } = require('../src/renderer/main.js');
        const app = new PattermElectronApp();
        const { electronAPI } = window;
        electronAPI.getBuildInfo.mockResolvedValueOnce({
            version: '0.6.0',
            commitId: '09b4000',
        });

        await expect(app.getAboutBuildInfo()).resolves.toEqual({
            version: '0.6.0',
            commitId: '09b4000',
        });
        expect(electronAPI.getBuildInfo).toHaveBeenCalledWith();
    });

    test('keeps desktop tab context actions on the shared shell', async () => {
        const { PattermElectronApp } = require('../src/renderer/main.js');
        const app = new PattermElectronApp();
        app.clearTerminal = jest.fn();
        app.copyTabContent = jest.fn();
        app.toggleConnection = jest.fn();

        const items = app.getTabContextMenuItems('tab-1');
        expect(items.map((item) => item.label)).toEqual([
            'Clear Screen',
            'Copy All Text',
            'Disconnect/Reconnect',
        ]);

        await items[0].action();
        await items[1].action();
        await items[2].action();

        expect(app.clearTerminal).toHaveBeenCalledWith('tab-1');
        expect(app.copyTabContent).toHaveBeenCalledWith('tab-1');
        expect(app.toggleConnection).toHaveBeenCalledWith('tab-1');
    });
});
