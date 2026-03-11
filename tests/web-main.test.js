const createBaseShell = () => class AppShell {
    constructor() {
        this.tabManager = {
            createTab: jest.fn(() => ({ id: 'tab-1' })),
            connectTab: jest.fn(() => Promise.resolve()),
            closeTab: jest.fn(),
        };
        this.tabComponents = new Map();
        this.theme = 'system';
    }

    async init() {
        return undefined;
    }

    clearTerminal() {}

    showAbout() {
        document.body.appendChild({ kind: 'about' });
    }
};

describe('web main app bootstrap', () => {
    beforeEach(() => {
        jest.resetModules();
        global.window = {
            matchMedia: jest.fn(() => ({
                addEventListener: jest.fn(),
            })),
            addEventListener: jest.fn(),
        };
        global.document = {
            createElement: jest.fn(() => ({
                className: '',
                innerHTML: '',
            })),
            body: {
                appendChild: jest.fn(),
            },
        };
        global.navigator = {};
    });

    test('bootstraps app and handles successful connection flow', async () => {
        const open = jest.fn(() => Promise.resolve());
        const saveTabContent = jest.fn(() => Promise.resolve());

        jest.doMock('../src/shared/js/app/AppShell.js', () => ({
            AppShell: createBaseShell(),
        }));
        jest.doMock('../src/web/js/services/SerialService.js', () => ({
            WebSerialProvider: jest.fn().mockImplementation(() => ({
                open,
                port: null,
            })),
        }));
        jest.doMock('../src/web/js/services/LogManager.js', () => ({
            LogManager: jest.fn().mockImplementation(() => ({
                saveTabContent,
            })),
        }));
        jest.doMock('../src/web/js/components/ConnectionDialog.js', () => ({
            ConnectionDialog: jest.fn(),
        }));
        jest.doMock('../src/shared/js/serial/normalizeSerialConfig.js', () => ({
            normalizeSerialConfig: jest.fn((config) => ({
                baudRate: config.baudRate,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none',
            })),
        }));
        jest.doMock('../src/web/js/utils/helpers.js', () => ({
            applyTheme: jest.fn(),
        }));
        jest.doMock('../src/web/js/utils/debug.js', () => ({
            debug: {
                log: jest.fn(),
                error: jest.fn(),
            },
        }));

        const { WebSerialProvider } = require('../src/web/js/services/SerialService.js');
        WebSerialProvider.isSupported = jest.fn(() => true);
        navigator.serviceWorker = {
            register: jest.fn(() => Promise.resolve()),
        };

        require('../src/web/js/main.js');
        const app = window.app;

        await app.createConnection({ baudRate: 115200 }, 'Main', { id: 'port-1' });
        expect(app.tabManager.createTab).toHaveBeenCalledWith(
            expect.objectContaining({ baudRate: 115200 }),
            'Main'
        );
        expect(open).toHaveBeenCalled();
        expect(app.tabManager.connectTab).toHaveBeenCalledWith('tab-1', expect.any(Object));

        app.tabComponents.set('tab-1', {
            terminal: {
                getContent: () => 'terminal output',
                copyAll: jest.fn(() => Promise.resolve()),
            },
        });
        await app.saveTabOutput('tab-1');
        expect(saveTabContent).toHaveBeenCalledWith('terminal output');

        app.showAbout();
        app.showError('boom');
        expect(document.body.appendChild).toHaveBeenCalledTimes(2);
    });

    test('handles unsupported browser and connection failures', async () => {
        const debug = {
            log: jest.fn(),
            error: jest.fn(),
        };

        jest.doMock('../src/shared/js/app/AppShell.js', () => ({
            AppShell: createBaseShell(),
        }));
        jest.doMock('../src/web/js/services/SerialService.js', () => ({
            WebSerialProvider: jest.fn().mockImplementation(() => ({
                open: jest.fn(() => Promise.reject(new Error('Open failed'))),
                port: null,
            })),
        }));
        jest.doMock('../src/web/js/services/LogManager.js', () => ({
            LogManager: jest.fn(),
        }));
        jest.doMock('../src/web/js/components/ConnectionDialog.js', () => ({
            ConnectionDialog: jest.fn().mockImplementation(() => ({
                show: jest.fn(() => Promise.resolve({ confirmed: false })),
            })),
        }));
        jest.doMock('../src/shared/js/serial/normalizeSerialConfig.js', () => ({
            normalizeSerialConfig: jest.fn((config) => config),
        }));
        jest.doMock('../src/web/js/utils/helpers.js', () => ({
            applyTheme: jest.fn(),
        }));
        jest.doMock('../src/web/js/utils/debug.js', () => ({ debug }));

        const { WebSerialProvider } = require('../src/web/js/services/SerialService.js');
        WebSerialProvider.isSupported = jest.fn(() => false);

        require('../src/web/js/main.js');
        const app = window.app;
        expect(document.body.appendChild).toHaveBeenCalled();

        WebSerialProvider.isSupported.mockReturnValue(true);
        await app.createConnection({ baudRate: 9600 }, 'Retry', { id: 'port-2' });
        expect(app.tabManager.closeTab).toHaveBeenCalledWith('tab-1');
        expect(debug.error).toHaveBeenCalled();
    });

    test('registerPlatformEventHandlers, showConnectionDialog, service worker setup, and copy fallback paths work', async () => {
        const mediaListener = jest.fn();
        let registeredLoadListener = null;
        const applyTheme = jest.fn();
        const debug = {
            log: jest.fn(),
            error: jest.fn(),
        };
        const dialogResult = {
            confirmed: true,
            config: { baudRate: 57600 },
            tabName: 'Auto',
            port: { id: 'port-3' },
        };

        global.window = {
            matchMedia: jest.fn(() => ({
                addEventListener: mediaListener,
            })),
            addEventListener: jest.fn((type, listener) => {
                if (type === 'load') {
                    registeredLoadListener = listener;
                }
            }),
        };
        global.document = {
            createElement: jest.fn(() => ({
                className: '',
                innerHTML: '',
            })),
            body: {
                appendChild: jest.fn(),
            },
        };
        global.navigator = {
            serviceWorker: {
                register: jest.fn(() => Promise.resolve()),
            },
        };

        jest.doMock('../src/shared/js/app/AppShell.js', () => ({
            AppShell: createBaseShell(),
        }));
        jest.doMock('../src/web/js/services/SerialService.js', () => ({
            WebSerialProvider: jest.fn().mockImplementation(() => ({
                open: jest.fn(() => Promise.resolve()),
                port: null,
            })),
        }));
        jest.doMock('../src/web/js/services/LogManager.js', () => ({
            LogManager: jest.fn(),
        }));
        jest.doMock('../src/web/js/components/ConnectionDialog.js', () => ({
            ConnectionDialog: jest.fn().mockImplementation(() => ({
                show: jest.fn(() => Promise.resolve(dialogResult)),
            })),
        }));
        jest.doMock('../src/shared/js/serial/normalizeSerialConfig.js', () => ({
            normalizeSerialConfig: jest.fn((config) => ({
                ...config,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none',
            })),
        }));
        jest.doMock('../src/web/js/utils/helpers.js', () => ({
            applyTheme,
        }));
        jest.doMock('../src/web/js/utils/debug.js', () => ({ debug }));

        const { WebSerialProvider } = require('../src/web/js/services/SerialService.js');
        WebSerialProvider.isSupported = jest.fn(() => true);

        require('../src/web/js/main.js');
        const app = window.app;
        app.createConnection = jest.fn(() => Promise.resolve());
        app.theme = 'system';

        app.registerPlatformEventHandlers();
        mediaListener.mock.calls[0][1]();
        expect(applyTheme).toHaveBeenCalledWith('system');

        await app.showConnectionDialog();
        expect(app.createConnection).toHaveBeenCalledWith(
            dialogResult.config,
            'Auto',
            dialogResult.port
        );

        app.tabComponents.set('tab-1', {
            terminal: {
                copyAll: jest.fn(() => Promise.reject(new Error('copy failed'))),
                getContent: jest.fn(() => 'ignored'),
            },
        });
        await app.copyTabContent('tab-1');
        await app.copyTabContent('missing');
        expect(debug.error).toHaveBeenCalledWith('Failed to copy:', expect.any(Error));

        app.initServiceWorker();
        await registeredLoadListener();
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });
});
