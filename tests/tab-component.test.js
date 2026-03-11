class FakeClassList {
    constructor() {
        this.values = new Set();
    }

    add(...tokens) {
        tokens.forEach((token) => this.values.add(token));
    }

    remove(...tokens) {
        tokens.forEach((token) => this.values.delete(token));
    }

    contains(token) {
        return this.values.has(token);
    }

    toggle(token, force) {
        if (force === true) {
            this.values.add(token);
            return true;
        }

        if (force === false) {
            this.values.delete(token);
            return false;
        }

        if (this.values.has(token)) {
            this.values.delete(token);
            return false;
        }

        this.values.add(token);
        return true;
    }
}

class FakeElement {
    constructor() {
        this.textContent = '';
        this.value = '';
        this.disabled = false;
        this.style = {};
        this.classList = new FakeClassList();
        this.dataset = {};
        this.listeners = new Map();
    }

    focus() {
        this.focused = true;
    }

    select() {
        this.selected = true;
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    remove() {
        this.removed = true;
    }
}

describe('TabComponent', () => {
    beforeEach(() => {
        jest.resetModules();
        global.document = {
            createElement: jest.fn(() => {
                const element = new FakeElement();
                Object.defineProperty(element, 'innerHTML', {
                    get() {
                        return this.textContent;
                    },
                    set(value) {
                        this.textContent = value;
                    },
                });
                return element;
            }),
        };
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('handleSend sends trimmed input only when connected', async () => {
        const { TabComponent } = require('../src/web/js/components/TabComponent.js');
        const inputField = new FakeElement();
        const onSend = jest.fn();
        const tab = new TabComponent({
            id: 'tab-1',
            connected: true,
        }, { onSend });

        inputField.value = '  AT+RST  ';
        tab.element = {
            querySelector(selector) {
                if (selector === '.input-field') {
                    return inputField;
                }
                return null;
            },
        };

        await tab.handleSend();
        expect(onSend).toHaveBeenCalledWith('tab-1', 'AT+RST');
        expect(inputField.value).toBe('');

        tab.tabState.connected = false;
        inputField.value = 'AT';
        await tab.handleSend();
        expect(onSend).toHaveBeenCalledTimes(1);
    });

    test('updateConnectionState toggles controls and labels', () => {
        const { TabComponent } = require('../src/web/js/components/TabComponent.js');
        const statusDot = new FakeElement();
        const inputStatus = new FakeElement();
        const indicator = new FakeElement();
        const sendBtn = new FakeElement();
        const inputField = new FakeElement();
        const portName = new FakeElement();
        const tab = new TabComponent({
            id: 'tab-1',
            connected: false,
        });

        tab.tabElement = {
            querySelector: (selector) => selector === '.tab-status' ? statusDot : null,
            classList: new FakeClassList(),
        };
        tab.element = {
            querySelector(selector) {
                if (selector === '.input-bar .status-dot') return inputStatus;
                if (selector === '.send-btn') return sendBtn;
                if (selector === '.input-field') return inputField;
                return null;
            },
            style: {},
        };
        tab.statusBarElements = { indicator, portName };

        tab.updateConnectionState(true);
        expect(sendBtn.disabled).toBe(false);
        expect(inputField.disabled).toBe(false);
        expect(portName.textContent).toBe('Connected');

        tab.updateConnectionState(false);
        expect(sendBtn.disabled).toBe(true);
        expect(inputField.disabled).toBe(true);
        expect(portName.textContent).toBe('Not Connected');
    });

    test('updateSearchState, focusSearch, setActive, and triggerPulse update UI state', () => {
        const { TabComponent } = require('../src/web/js/components/TabComponent.js');
        const searchCount = new FakeElement();
        const prevButton = new FakeElement();
        const nextButton = new FakeElement();
        const searchInput = new FakeElement();
        const badge = new FakeElement();
        const tab = new TabComponent({ id: 'tab-1' });

        tab.element = {
            querySelector(selector) {
                if (selector === '.terminal-search-count') return searchCount;
                if (selector === '.terminal-search-input') return searchInput;
                return null;
            },
            querySelectorAll(selector) {
                if (selector === '.terminal-nav-btn') return [prevButton, nextButton];
                return [];
            },
            style: {},
        };
        tab.tabElement = {
            classList: new FakeClassList(),
        };
        tab.terminal = {
            getSearchState: () => ({ totalMatches: 2, currentMatch: 1 }),
        };
        tab.statusBarElements = {
            rxBadge: badge,
            txBadge: new FakeElement(),
        };

        tab.updateSearchState();
        expect(searchCount.textContent).toBe('1 / 2');
        expect(prevButton.disabled).toBe(false);

        tab.focusSearch();
        expect(searchInput.focused).toBe(true);
        expect(searchInput.selected).toBe(true);

        tab.setActive(true);
        expect(tab.element.style.display).toBe('block');
        expect(tab.tabElement.classList.contains('active')).toBe(true);

        tab.triggerPulse('rx');
        expect(badge.classList.contains('active')).toBe(true);
        jest.runAllTimers();
        expect(badge.classList.contains('active')).toBe(false);
    });

    test('updateStatusBar, updatePortName, setName, filters, and destroy update the view', () => {
        const { TabComponent } = require('../src/web/js/components/TabComponent.js');
        const tabName = new FakeElement();
        const searchInput = new FakeElement();
        const allButton = new FakeElement();
        const errorButton = new FakeElement();
        const rxBytes = new FakeElement();
        const txBytes = new FakeElement();
        const duration = new FakeElement();
        const currentTime = new FakeElement();
        const rxRate = new FakeElement();
        const txRate = new FakeElement();
        const element = new FakeElement();
        const tabElement = new FakeElement();

        allButton.dataset.filterType = 'all';
        errorButton.dataset.filterType = 'error';

        const tab = new TabComponent({
            id: 'tab-1',
            name: 'Original',
            rxBytesTotal: 2048,
            txBytesTotal: 1024,
            rxRate: 512,
            txRate: 256,
            startTime: Date.now() - 2000,
            filterState: {
                search: 'boom',
                type: 'error',
            },
        });

        tab.element = {
            style: {},
            querySelector(selector) {
                if (selector === '.terminal-search-count') return new FakeElement();
                if (selector === '.terminal-search-input') return searchInput;
                return null;
            },
            querySelectorAll(selector) {
                if (selector === '.terminal-nav-btn') return [new FakeElement(), new FakeElement()];
                if (selector === '.terminal-filter-btn') return [allButton, errorButton];
                return [];
            },
            remove: jest.fn(),
        };
        tab.tabElement = {
            querySelector: (selector) => selector === '.tab-name' ? tabName : null,
            classList: new FakeClassList(),
            remove: jest.fn(),
        };
        tab.statusBarElements = {
            rxBytes,
            txBytes,
            duration,
            currentTime,
            rxRate,
            txRate,
            rxBadge: new FakeElement(),
            txBadge: new FakeElement(),
            portName: new FakeElement(),
        };
        tab.terminal = {
            getSearchState: () => ({ totalMatches: 0, currentMatch: 0 }),
            getFilters: jest.fn(() => ({ search: 'boom', type: 'error' })),
            setFilters: jest.fn(),
        };

        tab.updateStatusBar();
        expect(rxBytes.textContent).toBe('2 KB');
        expect(txBytes.textContent).toBe('1 KB');

        tab.updateRates(128, 64);
        expect(rxRate.textContent).toBe('128 B/s');
        expect(txRate.textContent).toBe('64 B/s');

        tab.updatePortName({
            baudRate: 115200,
            dataBits: 8,
            parity: 'even',
            stopBits: 1,
        });
        expect(tab.statusBarElements.portName.textContent).toBe('@ 115200 8E1');

        tab.setName('Renamed');
        expect(tabName.textContent).toBe('Renamed');
        expect(tab.getFilterState()).toEqual({ search: 'boom', type: 'error' });

        tab.restoreTerminalState();
        expect(searchInput.value).toBe('boom');
        expect(errorButton.classList.contains('active')).toBe(true);
        expect(allButton.classList.contains('active')).toBe(false);
        expect(tab.terminal.setFilters).toHaveBeenCalledWith({ search: 'boom', type: 'error' });

        tab.destroy();
        expect(tab.element.remove).toHaveBeenCalled();
        expect(tab.tabElement.remove).toHaveBeenCalled();
    });

    test('attachEventListeners routes close, switch, send, clear, search, nav, and context menu actions', async () => {
        const { TabComponent } = require('../src/web/js/components/TabComponent.js');
        const closeBtn = new FakeElement();
        const sendBtn = new FakeElement();
        const inputField = new FakeElement();
        const clearBtn = new FakeElement();
        const terminalDisplay = new FakeElement();
        const searchInput = new FakeElement();
        const prevButton = new FakeElement();
        const nextButton = new FakeElement();
        const allButton = new FakeElement();
        const txButton = new FakeElement();
        const onClose = jest.fn();
        const onSwitch = jest.fn();
        const onSend = jest.fn();
        const onClear = jest.fn();
        const onContextMenu = jest.fn();
        const onFiltersChange = jest.fn();

        prevButton.dataset.searchNav = 'prev';
        nextButton.dataset.searchNav = 'next';
        allButton.dataset.filterType = 'all';
        txButton.dataset.filterType = 'tx';

        const tab = new TabComponent({
            id: 'tab-1',
            connected: true,
        }, {
            onClose,
            onSwitch,
            onSend,
            onClear,
            onContextMenu,
            onFiltersChange,
        });

        tab.tabElement = {
            querySelector: (selector) => selector === '.tab-close-btn' ? closeBtn : null,
            addEventListener: jest.fn((type, listener) => {
                if (type === 'click') {
                    tab.tabClick = listener;
                }
            }),
        };
        tab.element = {
            querySelector(selector) {
                if (selector === '.send-btn') return sendBtn;
                if (selector === '.input-field') return inputField;
                if (selector === '.clear-btn') return clearBtn;
                if (selector === '.terminal-display') return terminalDisplay;
                if (selector === '.terminal-search-input') return searchInput;
                return null;
            },
            querySelectorAll(selector) {
                if (selector === '.terminal-nav-btn') return [prevButton, nextButton];
                if (selector === '.terminal-filter-btn') return [allButton, txButton];
                return [];
            },
        };
        tab.getFilterState = jest.fn(() => ({ search: 'AT', type: 'tx' }));
        tab.updateSearchState = jest.fn();
        tab.terminal = {
            clear: jest.fn(),
            setFilters: jest.fn(),
            navigateSearchResults: jest.fn(),
        };

        tab.attachEventListeners();

        closeBtn.listeners.get('click')({ stopPropagation: jest.fn() });
        tab.tabClick();
        inputField.value = 'AT';
        await sendBtn.listeners.get('click')();
        inputField.value = 'ATI';
        inputField.listeners.get('keydown')({ key: 'Enter' });
        clearBtn.listeners.get('click')();
        terminalDisplay.listeners.get('contextmenu')({ preventDefault: jest.fn(), type: 'contextmenu' });
        searchInput.listeners.get('input')({ target: { value: 'ERR' } });
        searchInput.listeners.get('keydown')({ key: 'Enter', preventDefault: jest.fn(), shiftKey: true });
        prevButton.listeners.get('click')();
        nextButton.listeners.get('click')();
        txButton.listeners.get('click')();

        expect(onClose).toHaveBeenCalledWith('tab-1');
        expect(onSwitch).toHaveBeenCalledWith('tab-1');
        expect(onSend).toHaveBeenCalledWith('tab-1', 'AT');
        expect(onSend).toHaveBeenCalledWith('tab-1', 'ATI');
        expect(onClear).toHaveBeenCalledWith('tab-1');
        expect(onContextMenu).toHaveBeenCalledWith('tab-1', expect.objectContaining({ type: 'contextmenu' }));
        expect(tab.terminal.setFilters).toHaveBeenCalledWith({ search: 'ERR' });
        expect(tab.terminal.setFilters).toHaveBeenCalledWith({ type: 'tx' });
        expect(tab.terminal.navigateSearchResults).toHaveBeenCalledWith(-1);
        expect(tab.terminal.navigateSearchResults).toHaveBeenCalledWith(1);
        expect(onFiltersChange).toHaveBeenCalledWith('tab-1', { search: 'AT', type: 'tx' });
    });
});
