import { globalEvents } from './EventManager.js';

export class TabManager {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
    }

    createTab(config, tabName) {
        const tabId = `tab-${this.tabCounter++}`;
        const now = new Date();

        const tabState = {
            id: tabId,
            name: tabName || `Port ${config.baudRate}`,
            config,
            service: null,
            connected: false,
            element: null,
            tabElement: null,
            terminal: null,
            rxBytes: 0,
            txBytes: 0,
            rxBytesTotal: 0,
            txBytesTotal: 0,
            startTime: null,
            createdTime: now,
            rxRate: 0,
            txRate: 0,
            lastRxTime: Date.now(),
            lastTxTime: Date.now(),
            rxBytesAccumulator: 0,
            txBytesAccumulator: 0,
            autoScroll: true,
            isLogging: false,
            logHandle: null,
            theme: 'system'
        };

        this.tabs.set(tabId, tabState);
        globalEvents.emit('tab:created', tabState);
        return tabState;
    }

    async connectTab(tabId, service) {
        console.log('[TabManager] connectTab called with tabId:', tabId);
        const tab = this.tabs.get(tabId);
        if (!tab) {
            throw new Error(`Tab ${tabId} not found`);
        }
        console.log('[TabManager] Tab found, setting up service listeners');

        tab.service = service;
        tab.connected = true;
        tab.startTime = new Date();

        service.on('data', (data) => {
            console.log('[TabManager] Data received:', data);
            this.onDataReceived(tabId, data);
        });

        service.on('error', (error) => {
            console.error('[TabManager] Service error:', error);
            globalEvents.emit('tab:error', { tabId, error });
        });

        service.on('close', () => {
            console.log('[TabManager] Service closed');
            tab.connected = false;
            globalEvents.emit('tab:disconnected', { tabId });
        });

        console.log('[TabManager] Emitting tab:connected event');
        globalEvents.emit('tab:connected', { tabId });
    }

    onDataReceived(tabId, data) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        const now = Date.now();
        const timeDiff = (now - tab.lastRxTime) / 1000;

        tab.rxBytesAccumulator += data.length;
        tab.rxBytesTotal += data.length;

        if (timeDiff >= 1) {
            tab.rxRate = Math.round(tab.rxBytesAccumulator / timeDiff);
            tab.rxBytesAccumulator = 0;
            tab.lastRxTime = now;
            globalEvents.emit('tab:ratesUpdated', { tabId, rxRate: tab.rxRate, txRate: tab.txRate });
        }

        globalEvents.emit('tab:data', { tabId, data });
    }

    onDataSent(tabId, data) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        const now = Date.now();
        const timeDiff = (now - tab.lastTxTime) / 1000;

        const bytes = data.length;
        tab.txBytesAccumulator += bytes;
        tab.txBytesTotal += bytes;

        if (timeDiff >= 1) {
            tab.txRate = Math.round(tab.txBytesAccumulator / timeDiff);
            tab.txBytesAccumulator = 0;
            tab.lastTxTime = now;
            globalEvents.emit('tab:ratesUpdated', { tabId, rxRate: tab.rxRate, txRate: tab.txRate });
        }
    }

    switchTab(tabId) {
        if (!this.tabs.has(tabId)) {
            console.warn(`Tab ${tabId} not found`);
            return;
        }

        this.tabs.forEach((tab, id) => {
            if (tab.element) {
                tab.element.style.display = id === tabId ? 'block' : 'none';
            }
            if (tab.tabElement) {
                tab.tabElement.classList.toggle('active', id === tabId);
            }
        });

        this.activeTabId = tabId;
        globalEvents.emit('tab:switched', { tabId });
    }

    async closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        if (tab.service && tab.connected) {
            await tab.service.disconnect();
        }

        if (tab.element) {
            tab.element.remove();
        }
        if (tab.tabElement) {
            tab.tabElement.remove();
        }

        this.tabs.delete(tabId);

        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(remainingTabs[0]);
            } else {
                this.activeTabId = null;
            }
        }

        globalEvents.emit('tab:closed', { tabId });
    }

    getTab(tabId) {
        return this.tabs.get(tabId);
    }

    getActiveTab() {
        return this.activeTabId ? this.tabs.get(this.activeTabId) : null;
    }

    getAllTabs() {
        return Array.from(this.tabs.values());
    }

    async disconnectTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.service) {
            return;
        }

        await tab.service.disconnect();
        tab.connected = false;
        globalEvents.emit('tab:disconnected', { tabId });
    }

    async reconnectTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.service) {
            throw new Error(`Cannot reconnect tab ${tabId}: no service found`);
        }

        await tab.service.reconnect();
        tab.connected = true;
        globalEvents.emit('tab:connected', { tabId });
    }

    renameTab(tabId, newName) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        tab.name = newName;
        globalEvents.emit('tab:renamed', { tabId, name: newName });
    }

    toggleAutoScroll(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        tab.autoScroll = !tab.autoScroll;
        return tab.autoScroll;
    }

    clearTerminal(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.terminal) return;

        tab.terminal.clear();
        globalEvents.emit('tab:cleared', { tabId });
    }

    getTabConfig(tabId) {
        const tab = this.tabs.get(tabId);
        return tab ? tab.config : null;
    }

    getTabState(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return null;

        return {
            id: tab.id,
            name: tab.name,
            connected: tab.connected,
            rxBytes: tab.rxBytesTotal,
            txBytes: tab.txBytesTotal,
            rxRate: tab.rxRate,
            txRate: tab.txRate,
            startTime: tab.startTime,
            createdTime: tab.createdTime,
            autoScroll: tab.autoScroll,
            isLogging: tab.isLogging,
            config: tab.config
        };
    }
}
