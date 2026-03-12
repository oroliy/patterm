const createBaseShell = () => class AppShell {
    constructor() {
        this.tabManager = {
            getTab: jest.fn(() => ({ connected: false })),
            disconnectTab: jest.fn(() => Promise.resolve()),
            reconnectTab: jest.fn(() => Promise.resolve()),
        };
        this.tabComponents = new Map();
        this.commandPaletteCommands = [];
    }

    async init() {
        return undefined;
    }

    registerCommandPaletteCommands() {
        this.commandPaletteCommands = [
            { id: 'search-current-tab' },
            { id: 'search-all-tabs' },
            { id: 'toggle-transactions' },
            { id: 'toggle-workflows' },
            { id: 'clear-active-terminal' },
            { id: 'close-active-tab' },
            { id: 'new-connection' },
        ];
    }

    closeTab() {}

    switchTab() {}
};

describe('electron renderer app', () => {
    beforeEach(() => {
        jest.resetModules();

        global.document = {
            createElement: jest.fn(() => ({
                className: '',
                dataset: {},
                style: {},
                innerHTML: '',
                textContent: '',
                querySelector: jest.fn((selector) => {
                    if (selector === '.tab-close-btn') {
                        return { addEventListener: jest.fn() };
                    }
                    if (selector === '.tab-name' || selector === '.tab-status') {
                        return { textContent: '', classList: { toggle: jest.fn() } };
                    }
                    return null;
                }),
                addEventListener: jest.fn(),
                remove: jest.fn(),
                classList: { toggle: jest.fn() },
            })),
            getElementById: jest.fn(() => ({
                appendChild: jest.fn(),
            })),
            body: {
                appendChild: jest.fn(),
            },
        };

        global.window = {
            require: jest.fn(() => ({
                ipcRenderer: {
                    on: jest.fn(),
                    invoke: jest.fn(() => Promise.resolve()),
                },
            })),
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

    test('filters out shared-surface-only command palette entries on Electron', () => {
        const { PattermElectronApp } = require('../src/renderer/main.js');
        const app = new PattermElectronApp();

        app.registerCommandPaletteCommands();

        expect(app.commandPaletteCommands.map((command) => command.id)).toEqual([
            'close-active-tab',
            'new-connection',
        ]);
    });

    test('uses a lightweight desktop tab shell and limits tab context menu actions', () => {
        const { PattermElectronApp } = require('../src/renderer/main.js');
        const app = new PattermElectronApp();
        app.switchTab = jest.fn();
        app.updateEmptyState = jest.fn();
        app.persistSession = jest.fn();

        app.onTabCreated({
            id: 'tab-1',
            connected: false,
            name: 'Main',
        });

        const component = app.tabComponents.get('tab-1');
        expect(component).toBeDefined();
        expect(component.terminal).toBeUndefined();
        expect(document.getElementById).toHaveBeenCalledWith('tabs-container');
        expect(app.getTabContextMenuItems('tab-1')).toEqual([
            expect.objectContaining({ label: 'Disconnect/Reconnect' }),
        ]);
    });
});
