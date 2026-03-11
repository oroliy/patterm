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

    test('createTab preserves filter state and trigger rules, and advances counter from restored ids', () => {
        const { globalEvents } = require('../src/web/js/services/EventManager.js');
        const { TabManager } = require('../src/web/js/services/TabManager.js');
        const manager = new TabManager();

        const restored = manager.createTab({ baudRate: 115200 }, 'Restored', {
            id: 'tab-3',
            filterState: { search: 'Echo', type: 'tx' },
            triggerRules: [{ pattern: 'READY', scope: 'rx', highlight: 'success' }],
        });
        const next = manager.createTab({ baudRate: 9600 }, 'Next');

        expect(restored.filterState).toEqual({ search: 'Echo', type: 'tx' });
        expect(restored.triggerRules).toEqual([
            expect.objectContaining({ pattern: 'READY', scope: 'rx', highlight: 'success' }),
        ]);
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

    test('TabManager covers connect, reconnect, rename, filters, and byte length fallbacks', async () => {
        const { globalEvents } = require('../src/web/js/services/EventManager.js');
        const { TabManager } = require('../src/web/js/services/TabManager.js');
        const manager = new TabManager();
        const tab = manager.createTab({ baudRate: 115200 }, 'Main');
        const listeners = {};
        const service = {
            on: jest.fn((event, callback) => {
                listeners[event] = callback;
            }),
            disconnect: jest.fn(() => Promise.resolve()),
            reconnect: jest.fn(() => Promise.resolve()),
        };

        await manager.connectTab(tab.id, service);
        listeners.data?.('RX');
        listeners.error?.(new Error('boom'));
        listeners.close?.();

        expect(globalEvents.emit).toHaveBeenCalledWith('tab:connected', { tabId: tab.id });
        expect(globalEvents.emit).toHaveBeenCalledWith('tab:error', {
            tabId: tab.id,
            error: expect.any(Error),
        });
        expect(globalEvents.emit).toHaveBeenCalledWith('tab:disconnected', { tabId: tab.id });

        await manager.disconnectTab(tab.id);
        await manager.reconnectTab(tab.id);
        expect(service.disconnect).toHaveBeenCalled();
        expect(service.reconnect).toHaveBeenCalled();

        manager.renameTab(tab.id, 'Renamed');
        expect(manager.getTabState(tab.id).name).toBe('Renamed');

        expect(manager.toggleAutoScroll(tab.id)).toBe(false);
        manager.updateFilterState(tab.id, { search: 'AT', type: 'tx' });
        expect(manager.getTabState(tab.id).filterState).toEqual({ search: 'AT', type: 'tx' });
        expect(manager.updateTriggerRules(tab.id, [{ pattern: 'ERROR', scope: 'error', highlight: 'danger' }])).toEqual([
            expect.objectContaining({ pattern: 'ERROR', scope: 'error', highlight: 'danger' }),
        ]);
        expect(manager.getTabState(tab.id).triggerRules).toEqual([
            expect.objectContaining({ pattern: 'ERROR', scope: 'error', highlight: 'danger' }),
        ]);

        tab.terminal = { clear: jest.fn() };
        manager.clearTerminal(tab.id);
        expect(tab.terminal.clear).toHaveBeenCalled();

        expect(manager.getByteLength(new ArrayBuffer(3))).toBe(3);
        expect(manager.getByteLength(new DataView(new ArrayBuffer(5)))).toBe(5);
        expect(manager.getByteLength(null)).toBe(0);
        expect(manager.getByteLength(1234)).toBe(4);
        expect(manager.parseTabCounter('port-a')).toBe(manager.tabCounter);
        expect(manager.getActiveTab()).toBeNull();
    });

    test('TabManager ignores missing tabs and throws on invalid reconnect targets', async () => {
        const { TabManager } = require('../src/web/js/services/TabManager.js');
        const manager = new TabManager();

        expect(manager.getTab('missing')).toBeUndefined();
        expect(manager.getTabState('missing')).toBeNull();
        expect(manager.getTabConfig('missing')).toBeNull();
        expect(manager.toggleAutoScroll('missing')).toBeUndefined();
        expect(manager.renameTab('missing', 'noop')).toBeUndefined();
        expect(manager.clearTerminal('missing')).toBeUndefined();
        expect(manager.disconnectTab('missing')).resolves.toBeUndefined();
        expect(manager.closeTab('missing')).resolves.toBeUndefined();
        expect(() => manager.switchTab('missing')).not.toThrow();
        await expect(manager.reconnectTab('missing')).rejects.toThrow('Cannot reconnect tab missing');
        await expect(manager.connectTab('missing', {})).rejects.toThrow('Tab missing not found');
    });
});
