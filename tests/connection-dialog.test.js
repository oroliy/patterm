class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    add(...tokens) {
        tokens.forEach((token) => this.values.add(token));
    }

    contains(token) {
        return this.values.has(token);
    }
}

class FakeElement {
    constructor() {
        this.value = '';
        this.textContent = '';
        this.style = {};
        this.disabled = false;
        this.classList = new FakeClassList();
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    remove() {
        this.removed = true;
    }
}

jest.mock('../src/web/js/utils/debug.js', () => ({
    debug: {
        log: jest.fn(),
    },
}));

describe('ConnectionDialog', () => {
    beforeEach(() => {
        jest.resetModules();
        global.navigator = {
            serial: {
                requestPort: jest.fn(),
            },
        };
        global.document = {
            createElement: jest.fn(() => new FakeElement()),
            body: {
                appendChild: jest.fn(),
            },
            addEventListener: jest.fn(),
        };
    });

    test('selectPort stores selected port, updates UI, and enables connect', async () => {
        const { ConnectionDialog } = require('../src/web/js/components/ConnectionDialog.js');
        const dialog = new ConnectionDialog();
        const infoEl = new FakeElement();
        const connectBtn = new FakeElement();
        const errorEl = new FakeElement();
        const port = {
            getInfo: () => ({
                usbVendorId: 0x1234,
                usbProductId: 0x5678,
            }),
        };

        dialog.dialog = {
            querySelector(selector) {
                if (selector === '#selected-port-info') {
                    return infoEl;
                }
                if (selector === '#connect-btn') {
                    return connectBtn;
                }
                if (selector === '#dialog-error') {
                    return errorEl;
                }
                return null;
            },
        };
        navigator.serial.requestPort.mockResolvedValue(port);

        await dialog.selectPort();

        expect(dialog.selectedPort).toBe(port);
        expect(infoEl.textContent).toBe('Selected: USB VID:PID 1234:5678');
        expect(infoEl.classList.contains('port-selected')).toBe(true);
        expect(connectBtn.disabled).toBe(false);
        expect(errorEl.style.display).toBe('none');
    });

    test('selectPort shows non-abort errors', async () => {
        const { ConnectionDialog } = require('../src/web/js/components/ConnectionDialog.js');
        const dialog = new ConnectionDialog();
        const errorEl = new FakeElement();

        dialog.dialog = {
            querySelector(selector) {
                if (selector === '#dialog-error') {
                    return errorEl;
                }
                return new FakeElement();
            },
        };
        navigator.serial.requestPort.mockRejectedValue(new Error('Permission denied'));

        await dialog.selectPort();

        expect(errorEl.textContent).toContain('Failed to select port: Permission denied');
        expect(errorEl.style.display).toBe('block');
    });

    test('handleConnect uses selected port and form values', async () => {
        const { ConnectionDialog } = require('../src/web/js/components/ConnectionDialog.js');
        const port = { id: 'port-1' };
        const dialog = new ConnectionDialog({
            onConnect: jest.fn(),
        });
        const fields = {
            '#baud-rate': { value: '115200' },
            '#data-bits': { value: '8' },
            '#stop-bits': { value: '1' },
            '#parity': { value: 'none' },
            '#flow-control': { value: 'none' },
            '#tab-name': { value: ' Debug Port ' },
        };

        dialog.selectedPort = port;
        dialog.dialog = {
            querySelector(selector) {
                return fields[selector];
            },
        };

        await dialog.handleConnect();

        expect(dialog.onConnect).toHaveBeenCalledWith(
            {
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none',
            },
            'Debug Port',
            port
        );
    });

    test('dialog helpers cover missing selection, fallback port info, and hide', async () => {
        const { ConnectionDialog } = require('../src/web/js/components/ConnectionDialog.js');
        const dialog = new ConnectionDialog({
            onCancel: jest.fn(),
        });
        const errorEl = new FakeElement();
        const connectBtn = new FakeElement();
        const input = { value: '   ' };

        dialog.dialog = {
            querySelector(selector) {
                if (selector === '#dialog-error') {
                    return errorEl;
                }
                if (selector === '#connect-btn') {
                    return connectBtn;
                }
                if (selector === '#tab-name') {
                    return input;
                }
                return new FakeElement();
            },
            addEventListener: jest.fn(),
        };
        dialog.overlay = new FakeElement();

        await dialog.handleConnect();
        expect(errorEl.textContent).toBe('Please select a serial port first');
        expect(errorEl.style.display).toBe('block');
        expect(dialog.getTabName('Fallback')).toBe('Fallback');
        expect(dialog.formatPortInfo({})).toBe('Port selected');

        dialog.setConnectEnabled(true);
        expect(connectBtn.disabled).toBe(false);
        dialog.clearError();
        expect(errorEl.textContent).toBe('');
        expect(errorEl.style.display).toBe('none');

        dialog.hide();
        expect(dialog.overlay).toBeNull();
        expect(dialog.dialog).toBeNull();
        expect(dialog.selectedPort).toBeNull();
    });

    test('show wires resolve handlers and event listeners', async () => {
        const { ConnectionDialog } = require('../src/web/js/components/ConnectionDialog.js');
        const overlay = new FakeElement();
        const dialogElement = new FakeElement();
        const closeBtn = new FakeElement();
        const cancelBtn = new FakeElement();
        const connectBtn = new FakeElement();
        const selectPortBtn = new FakeElement();
        const keyListeners = [];

        overlay.querySelector = (selector) => {
            if (selector === '.connection-dialog') return dialogElement;
            return null;
        };
        dialogElement.querySelector = (selector) => {
            if (selector === '.dialog-close-btn') return closeBtn;
            if (selector === '#cancel-btn') return cancelBtn;
            if (selector === '#connect-btn') return connectBtn;
            if (selector === '#select-port-btn') return selectPortBtn;
            return new FakeElement();
        };
        dialogElement.addEventListener = jest.fn();

        document.createElement = jest.fn(() => overlay);
        document.body = { appendChild: jest.fn() };
        document.addEventListener = jest.fn((type, listener) => {
            keyListeners.push({ type, listener });
        });

        const dialog = new ConnectionDialog();
        dialog.selectPort = jest.fn();
        const resultPromise = dialog.show();

        selectPortBtn.listeners.get('click')();
        expect(dialog.selectPort).toHaveBeenCalled();

        closeBtn.listeners.get('click')();
        await expect(resultPromise).resolves.toEqual({ confirmed: false });

        const dialog2 = new ConnectionDialog();
        dialog2.selectPort = jest.fn();
        document.createElement = jest.fn(() => overlay);
        const confirmPromise = dialog2.show();
        dialog2.onConnect({ baudRate: 115200 }, 'Main', { id: 'port-1' });
        await expect(confirmPromise).resolves.toEqual({
            confirmed: true,
            config: { baudRate: 115200 },
            tabName: 'Main',
            port: { id: 'port-1' },
        });

        expect(dialogElement.addEventListener).toHaveBeenCalled();
        expect(keyListeners.some(({ type }) => type === 'keydown')).toBe(true);
        expect(dialog2.getPortSelectionMarkup()).toContain('Select Port');
        expect(dialog2.getDialogHTML()).toContain('New Serial Connection');
    });
});
