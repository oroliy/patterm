jest.mock('../shared/js/debug.js', () => ({
    debug: {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));

describe('web services', () => {
    beforeEach(() => {
        jest.resetModules();
        global.navigator = {};
        global.window = {};
        global.CustomEvent = class {
            constructor(type, options = {}) {
                this.type = type;
                this.detail = options.detail;
            }
        };
        global.Event = class {};
        global.TextEncoder = TextEncoder;
        global.TextDecoderStream = class {
            constructor() {
                this.writable = {};
                this.readable = {
                    getReader: () => ({
                        read: jest.fn().mockResolvedValue({ done: true }),
                    }),
                };
            }
        };
    });

    test('WebSerialProvider request/open/write/list flows work with mocked serial API', async () => {
        const written = [];
        const writer = {
            write: jest.fn(async (chunk) => written.push(chunk)),
            releaseLock: jest.fn(),
        };
        const port = {
            getInfo: () => ({ usbVendorId: 0x1234, usbProductId: 0x5678 }),
            open: jest.fn(async () => {}),
            readable: {
                pipeTo: jest.fn(() => Promise.resolve()),
            },
            writable: {
                getWriter: () => writer,
            },
        };

        navigator.serial = {
            requestPort: jest.fn(async () => port),
            getPorts: jest.fn(async () => [port]),
        };

        const {
            WebSerialProvider,
            listAvailablePorts,
        } = require('../apps/web/src/services/SerialService.js');
        const provider = new WebSerialProvider();
        provider.startReading = jest.fn();

        await provider.requestPort([{ usbVendorId: 0x1234 }]);
        expect(navigator.serial.requestPort).toHaveBeenCalledWith({
            filters: [{ usbVendorId: 0x1234 }],
        });

        expect(await provider.getPortInfo()).toEqual({
            usbVendorId: 0x1234,
            usbProductId: 0x5678,
        });

        await provider.open({ baudRate: 115200 });
        expect(port.open).toHaveBeenCalledWith(
            expect.objectContaining({
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none',
            })
        );
        expect(provider.getConfig()).toEqual({
            baudRate: 115200,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none',
        });

        await provider.write('AT');
        expect(writer.write).toHaveBeenCalled();
        expect(new TextDecoder().decode(written[0])).toBe('AT');
        expect(writer.releaseLock).toHaveBeenCalled();

        expect(await listAvailablePorts()).toEqual([
            { usbVendorId: 0x1234, usbProductId: 0x5678 },
        ]);
    });

    test('WebSerialProvider covers unsupported, error, reconnect, and disconnect branches', async () => {
        const { debug } = require('../shared/js/debug.js');
        const {
            WebSerialProvider,
            listAvailablePorts,
        } = require('../apps/web/src/services/SerialService.js');

        await expect(new WebSerialProvider().requestPort()).rejects.toThrow('Web Serial API is not supported');
        await expect(new WebSerialProvider().getPortInfo()).rejects.toThrow('No port selected');

        navigator.serial = {
            getPorts: jest.fn(async () => {
                throw new Error('ports failed');
            }),
        };
        expect(await listAvailablePorts()).toEqual([]);
        expect(debug.error).toHaveBeenCalled();

        const provider = new WebSerialProvider();
        provider.port = {};
        provider.emit = jest.fn();
        await provider.startReading();
        expect(provider.emit).toHaveBeenCalledWith(
            'error',
            expect.objectContaining({
                message: expect.stringContaining('not readable'),
            })
        );

        provider.isConnected = false;
        await expect(provider.write('AT')).rejects.toThrow('Port is not open');
        await expect(provider.writeRaw(new Uint8Array([1]))).rejects.toThrow('Port is not open');

        const writer = {
            write: jest.fn(async () => {
                throw new Error('raw failed');
            }),
            releaseLock: jest.fn(),
        };
        const reader = {
            cancel: jest.fn(async () => {
                throw new Error('cancel failed');
            }),
        };
        provider.port = {
            writable: {
                getWriter: jest.fn(() => writer),
            },
            close: jest.fn(async () => {
                throw new Error('port close failed');
            }),
        };
        provider.isConnected = true;
        provider.writer = writer;
        provider.reader = reader;
        provider.readLoopController = { abort: jest.fn() };

        await expect(provider.writeRaw(new Uint8Array([1]))).rejects.toThrow('raw failed');
        expect(provider.emit).toHaveBeenCalledWith('error', expect.any(Error));

        await provider.disconnect();
        expect(reader.cancel).toHaveBeenCalled();
        expect(writer.releaseLock).toHaveBeenCalled();
        expect(provider.port.close).toHaveBeenCalled();

        const reconnecting = new WebSerialProvider();
        reconnecting.open = jest.fn(async () => {});
        reconnecting.setConfig({ baudRate: 9600 });
        await reconnecting.reconnect();
        expect(reconnecting.open).toHaveBeenCalledWith({
            baudRate: 9600,
        });

        await expect(new WebSerialProvider().reconnect()).rejects.toThrow('No previous configuration found');
    });

    test('EventManager supports on/off/once semantics', () => {
        const { EventManager } = require('../shared/js/services/EventManager.js');
        const manager = new EventManager();
        const values = [];
        const callback = (value) => values.push(value);

        const unsubscribe = manager.on('data', callback);
        manager.emit('data', 'first');
        unsubscribe();
        manager.emit('data', 'second');

        manager.once('data', (value) => values.push(`once:${value}`));
        manager.emit('data', 'third');
        manager.emit('data', 'fourth');

        expect(values).toEqual(['first', 'once:third']);
    });

    test('LogManager logs, flushes, and saves content with mocked file handles', async () => {
        const writes = [];
        const writable = {
            write: jest.fn(async (chunk) => writes.push(chunk)),
            close: jest.fn(async () => {}),
        };
        const fileHandle = {
            createWritable: jest.fn(async () => writable),
        };

        window.showSaveFilePicker = jest.fn(async () => fileHandle);

        const { LogManager } = require('../apps/web/src/services/LogManager.js');
        const manager = new LogManager();

        expect(await manager.startLogging('session.log')).toBe(true);
        await manager.log('hello', { type: 'rx' });
        await manager.logData(new Uint8Array([0x41, 0x54]), 'tx');
        expect(manager.getQueueSize()).toBe(2);

        await manager.flush();
        expect(writable.write).toHaveBeenCalled();
        expect(manager.getQueueSize()).toBe(0);

        expect(await manager.saveTabContent('content', 'output.txt')).toBe(true);

        await manager.stopLogging();
        expect(writable.close).toHaveBeenCalled();
        expect(manager.isActive()).toBe(false);
    });

    test('LogManager and EventManager cover failure branches', async () => {
        const { EventManager } = require('../shared/js/services/EventManager.js');
        const { LogManager } = require('../apps/web/src/services/LogManager.js');

        const manager = new EventManager();
        expect(manager.off('missing', () => {})).toBeUndefined();

        window.showSaveFilePicker = jest.fn(async () => {
            throw new Error('picker failed');
        });

        const logManager = new LogManager();
        expect(await logManager.startLogging('session.log')).toBe(false);
        expect(await logManager.saveTabContent('content', 'output.txt')).toBe(false);
        expect(await logManager.flush()).toBeUndefined();
    });
});
