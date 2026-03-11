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
    }

    focus() {
        this.focused = true;
    }

    select() {
        this.selected = true;
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
});
