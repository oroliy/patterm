jest.mock('../src/web/js/utils/debug.js', () => ({
    debug: {
        log: jest.fn(),
        error: jest.fn(),
    },
}));

describe('web services', () => {
    beforeEach(() => {
        jest.resetModules();
        global.navigator = {};
        global.window = {};
        global.CustomEvent = class CustomEvent {
            constructor(type, options = {}) {
                this.type = type;
                this.detail = options.detail;
            }
        };
        global.Event = class Event {};
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
        } = require('../src/web/js/services/SerialService.js');
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

    test('EventManager supports on/off/once semantics', () => {
        const { EventManager } = require('../src/web/js/services/EventManager.js');
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

        const { LogManager } = require('../src/web/js/services/LogManager.js');
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
});
