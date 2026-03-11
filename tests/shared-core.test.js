describe('shared core modules', () => {
    beforeEach(() => {
        jest.resetModules();

        global.document = {
            createElement: jest.fn(() => ({
                textContent: '',
                innerHTML: '',
                click: jest.fn(),
            })),
            createRange: jest.fn(() => ({
                selectNodeContents: jest.fn(),
            })),
            body: {
                appendChild: jest.fn(),
                removeChild: jest.fn(),
            },
            documentElement: {
                setAttribute: jest.fn(),
            },
        };

        global.window = {
            matchMedia: jest.fn(() => ({ matches: true })),
            getSelection: jest.fn(() => ({
                removeAllRanges: jest.fn(),
                addRange: jest.fn(),
            })),
            scrollY: 5,
            scrollX: 7,
        };

        global.localStorage = {
            getItem: jest.fn(() => null),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        };

        global.navigator = {
            clipboard: {
                writeText: jest.fn(() => Promise.resolve()),
                readText: jest.fn(() => Promise.resolve('copied')),
            },
        };

        global.URL = {
            createObjectURL: jest.fn(() => 'blob:url'),
            revokeObjectURL: jest.fn(),
        };
    });

    test('BaseSerialProvider manages config state and events', () => {
        const { BaseSerialProvider } = require('../src/shared/js/serial/BaseSerialProvider.js');
        const provider = new BaseSerialProvider();
        const values = [];
        const callback = (value) => values.push(value);

        provider.setConfig({ baudRate: 9600, parity: 'even' });
        provider.setConnected(true);
        provider.on('data', callback);
        provider.emit('data', 'hello');
        provider.off('data', callback);
        provider.emit('data', 'ignored');

        expect(provider.getConfig()).toEqual({ baudRate: 9600, parity: 'even' });
        expect(provider.getState()).toEqual({
            isConnected: true,
            config: { baudRate: 9600, parity: 'even' },
        });
        expect(values).toEqual(['hello']);
    });

    test('normalizeSerialConfig and formatters handle serial metadata', () => {
        const { normalizeSerialConfig } = require('../src/shared/js/serial/normalizeSerialConfig.js');
        const formatters = require('../src/shared/js/formatters.js');
        const config = normalizeSerialConfig({ baudRate: 57600, parity: 'odd' });
        const defaults = normalizeSerialConfig();

        expect(config).toEqual({
            baudRate: 57600,
            dataBits: 8,
            stopBits: 1,
            parity: 'odd',
            flowControl: 'none',
        });
        expect(defaults).toEqual({
            baudRate: 115200,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none',
        });
        expect(formatters.formatBytes(2048)).toBe('2 KB');
        expect(formatters.formatRate(2048)).toBe('2 KB/s');
        expect(formatters.formatDuration(Date.now() - 3661000)).toBe('01:01:01');
        expect(formatters.formatConnectionStatus(config)).toBe('57600 8O1');
        expect(formatters.formatPortName({ path: '/tmp/ttyV0' })).toBe('/tmp/ttyV0');
    });

    test('theme helpers and shared utils cover browser utility paths', async () => {
        const theme = require('../src/shared/js/theme.js');
        const utils = require('../src/shared/js/utils.js');

        expect(theme.getEffectiveTheme('system')).toBe('dark');
        theme.applyTheme('system');
        expect(document.documentElement.setAttribute).toHaveBeenCalledWith('data-theme', 'dark');
        expect(theme.cycleTheme('system')).toBe('dark');
        expect(theme.saveTheme('light')).toBe(true);
        localStorage.getItem.mockReturnValue('"stored"');
        expect(utils.loadFromLocalStorage('k', 'fallback')).toBe('stored');
        expect(theme.loadTheme()).toBe('"stored"');

        expect(utils.arrayBufferToHex(new Uint8Array([0x41, 0x54]))).toBe('41 54');
        expect(Array.from(utils.hexToArrayBuffer('41 54'))).toEqual([0x41, 0x54]);
        expect(utils.cn('a', false, 'b')).toBe('a b');
        expect(utils.copyToClipboard('hello')).resolves.toBeUndefined();
        await expect(utils.readClipboardText()).resolves.toBe('copied');

        const target = {
            getBoundingClientRect: () => ({ top: 10, left: 20, width: 30, height: 40 }),
            scrollTop: 0,
            scrollHeight: 500,
            clientHeight: 100,
        };
        expect(utils.getElementOffset(target)).toEqual({
            top: 15,
            left: 27,
            width: 30,
            height: 40,
        });
        utils.scrollToBottom(target);
        expect(target.scrollTop).toBe(500);
        expect(utils.isScrolledToBottom(target, 500)).toBe(true);
    });

    test('shared utils cover debounce, throttle, storage fallbacks, and DOM helpers', async () => {
        jest.useFakeTimers();

        const utils = require('../src/shared/js/utils.js');
        const debounced = jest.fn();
        const throttled = jest.fn();
        const fallbackElement = {
            innerHTML: '',
            textContent: '',
        };
        const link = {
            href: '',
            download: '',
            click: jest.fn(),
        };
        const selection = {
            removeAllRanges: jest.fn(),
            addRange: jest.fn(),
        };
        const target = {
            getBoundingClientRect: () => ({ top: 1, left: 2, width: 3, height: 4 }),
            scrollTop: 25,
            scrollHeight: 100,
            clientHeight: 50,
        };

        document.createElement.mockImplementation((tagName) => {
            if (tagName === 'div') {
                return fallbackElement;
            }

            if (tagName === 'a') {
                return link;
            }

            return {
                textContent: '',
                innerHTML: '',
                click: jest.fn(),
            };
        });
        window.getSelection.mockReturnValue(selection);

        const runDebounce = utils.debounce(debounced, 100);
        runDebounce('first');
        runDebounce('second');
        jest.advanceTimersByTime(100);
        expect(debounced).toHaveBeenCalledTimes(1);
        expect(debounced).toHaveBeenCalledWith('second');

        const runThrottle = utils.throttle(throttled, 100);
        runThrottle('one');
        runThrottle('two');
        jest.advanceTimersByTime(100);
        runThrottle('three');
        expect(throttled.mock.calls).toEqual([['one'], ['three']]);

        expect(utils.escapeHtml('<script>')).toBe('');
        expect(utils.generateId()).toMatch(/^\d+-/);

        localStorage.setItem.mockImplementation(() => {
            throw new Error('set failed');
        });
        localStorage.removeItem.mockImplementation(() => {
            throw new Error('remove failed');
        });
        localStorage.getItem.mockImplementation(() => {
            throw new Error('get failed');
        });
        expect(utils.saveToLocalStorage('key', { ok: true })).toBe(false);
        expect(utils.loadFromLocalStorage('key', 'fallback')).toBe('fallback');
        expect(utils.removeFromLocalStorage('key')).toBe(false);

        navigator.clipboard = null;
        await expect(utils.copyToClipboard('hello')).rejects.toThrow('Clipboard API not available');
        await expect(utils.readClipboardText()).resolves.toBeNull();

        utils.downloadBlob('body', 'file.txt');
        expect(document.body.appendChild).toHaveBeenCalledWith(link);
        expect(link.click).toHaveBeenCalled();
        expect(document.body.removeChild).toHaveBeenCalledWith(link);

        utils.selectElementContents(target);
        expect(selection.removeAllRanges).toHaveBeenCalled();
        expect(selection.addRange).toHaveBeenCalled();
        expect(utils.isScrolledToBottom(target)).toBe(false);

        jest.useRealTimers();
    });
});
