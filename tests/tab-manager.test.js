jest.mock('../src/web/js/services/EventManager.js', () => ({
    globalEvents: {
        emit: jest.fn(),
    },
}));

jest.mock('../src/web/js/utils/debug.js', () => ({
    debug: {
        log: jest.fn(),
        error: jest.fn(),
    },
}));

describe('TabManager', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    test('createTab preserves filter state and advances counter from restored ids', () => {
        const { globalEvents } = require('../src/web/js/services/EventManager.js');
        const { TabManager } = require('../src/web/js/services/TabManager.js');
        const manager = new TabManager();

        const restored = manager.createTab({ baudRate: 115200 }, 'Restored', {
            id: 'tab-3',
            filterState: { search: 'Echo', type: 'tx' },
        });
        const next = manager.createTab({ baudRate: 9600 }, 'Next');

        expect(restored.filterState).toEqual({ search: 'Echo', type: 'tx' });
        expect(next.id).toBe('tab-4');
        expect(globalEvents.emit).toHaveBeenCalledWith('tab:created', restored);
    });

    test('onDataReceived updates totals and emits rate updates for binary payloads', () => {
        const { globalEvents } = require('../src/web/js/services/EventManager.js');
        const { TabManager } = require('../src/web/js/services/TabManager.js');
        const manager = new TabManager();
        const tab = manager.createTab({ baudRate: 115200 }, 'Main');

        tab.lastRxTime = Date.now() - 1500;
        manager.onDataReceived(tab.id, new Uint8Array([1, 2, 3, 4]));

        expect(tab.rxBytesTotal).toBe(4);
        expect(tab.rxRate).toBeGreaterThan(0);
        expect(globalEvents.emit).toHaveBeenCalledWith(
            'tab:ratesUpdated',
            expect.objectContaining({ tabId: tab.id, txRate: 0 })
        );
        expect(globalEvents.emit).toHaveBeenCalledWith('tab:data', {
            tabId: tab.id,
            data: new Uint8Array([1, 2, 3, 4]),
        });
    });

    test('closeTab disconnects active service and switches to remaining tab', async () => {
        const { globalEvents } = require('../src/web/js/services/EventManager.js');
        const { TabManager } = require('../src/web/js/services/TabManager.js');
        const manager = new TabManager();
        const first = manager.createTab({ baudRate: 115200 }, 'First');
        const second = manager.createTab({ baudRate: 9600 }, 'Second');

        first.service = { disconnect: jest.fn(() => Promise.resolve()) };
        first.connected = true;
        manager.activeTabId = first.id;

        await manager.closeTab(first.id);

        expect(first.service.disconnect).toHaveBeenCalled();
        expect(manager.activeTabId).toBe(second.id);
        expect(globalEvents.emit).toHaveBeenCalledWith('tab:closed', { tabId: first.id });
    });
});
