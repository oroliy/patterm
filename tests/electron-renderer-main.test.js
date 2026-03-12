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
        const ipcRenderer = {
            on: jest.fn(),
            invoke: jest.fn(() => Promise.resolve()),
        };
        const fs = {
            promises: {
                writeFile: jest.fn(() => Promise.resolve()),
            },
        };

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
            require: jest.fn((name) => {
                if (name === 'electron') {
                    return { ipcRenderer };
                }

                if (name === 'fs') {
                    return fs;
                }

                throw new Error(`Unexpected module: ${name}`);
            }),
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
        const ipcRenderer = window.require('electron').ipcRenderer;
        const fs = window.require('fs');
        ipcRenderer.invoke.mockResolvedValueOnce('/tmp/export.txt');

        const save = app.getTabSaveHandler('tab-1');
        await expect(save('content', 'export.txt')).resolves.toBe(true);

        expect(ipcRenderer.invoke).toHaveBeenCalledWith('dialog:saveFile', expect.objectContaining({
            defaultPath: 'export.txt',
        }));
        expect(fs.promises.writeFile).toHaveBeenCalledWith('/tmp/export.txt', 'content', 'utf8');
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
