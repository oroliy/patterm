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
});
