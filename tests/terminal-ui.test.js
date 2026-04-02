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

class FakeTextNode {
    constructor(text) {
        this.nodeType = 3;
        this.textContent = text;
    }
}

class FakeElement {
    constructor(tagName = 'div') {
        this.tagName = tagName.toUpperCase();
        this.children = [];
        this.parentNode = null;
        this.dataset = {};
        this.style = {};
        this.classList = new FakeClassList();
        this.scrollTop = 0;
        this.scrollHeight = 1000;
        this.clientHeight = 100;
        this.value = '';
        this.disabled = false;
        this._textContent = '';
        this._innerHTML = '';
        this._listeners = new Map();
        this.wasScrolledIntoView = false;
    }

    set className(value) {
        this.classList = new FakeClassList();
        value.split(/\s+/).filter(Boolean).forEach((token) => this.classList.add(token));
    }

    get className() {
        return Array.from(this.classList.values).join(' ');
    }

    set textContent(value) {
        this._textContent = value;
        this.children = [];
    }

    get textContent() {
        if (this.children.length === 0) {
            return this._textContent;
        }

        return this.children.map((child) => child.textContent || '').join('');
    }

    set innerHTML(value) {
        this._innerHTML = value;
        this.children = [];
        this._textContent = value ? value.replace(/<[^>]+>/g, '') : '';
    }

    get innerHTML() {
        if (this.children.length === 0) {
            return this._innerHTML;
        }

        return this.children.map((child) => child.textContent || '').join('');
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index >= 0) {
            this.children.splice(index, 1);
            child.parentNode = null;
        }
        return child;
    }

    remove() {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    }

    get firstChild() {
        return this.children[0] || null;
    }

    addEventListener(type, listener) {
        this._listeners.set(type, listener);
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
    }

    querySelectorAll(selector) {
        const results = [];
        const matcher = createSelectorMatcher(selector);

        const visit = (node) => {
            node.children.forEach((child) => {
                if (child instanceof FakeElement && matcher(child)) {
                    results.push(child);
                }
                if (child instanceof FakeElement) {
                    visit(child);
                }
            });
        };

        visit(this);
        return results;
    }

    focus() {
        this.focused = true;
    }

    select() {
        this.selected = true;
    }

    scrollIntoView() {
        this.wasScrolledIntoView = true;
    }

    click() {
        this.clicked = true;
    }
}

function createSelectorMatcher(selector) {
    if (selector.startsWith('.')) {
        const className = selector.slice(1);
        return (element) => element.classList.contains(className);
    }

    if (selector.startsWith('[')) {
        const match = selector.match(/\[data-([^=]+)="([^"]+)"\]/);
        if (match) {
            const [, key, value] = match;
            const dataKey = key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            return (element) => element.dataset[dataKey] === value;
        }
    }

    return (element) => element.tagName.toLowerCase() === selector.toLowerCase();
}

function installFakeDom() {
    global.document = {
        createElement: (tagName) => new FakeElement(tagName),
        createTextNode: (text) => new FakeTextNode(text),
        createRange: () => ({
            selectNodeContents: jest.fn(),
        }),
        body: new FakeElement('body'),
        documentElement: {
            setAttribute: jest.fn(),
        },
    };

    global.window = {
        getSelection: () => ({
            removeAllRanges: jest.fn(),
            addRange: jest.fn(),
            rangeCount: 0,
            toString: () => '',
        }),
        scrollY: 0,
        scrollX: 0,
        matchMedia: () => ({ matches: false }),
        prompt: jest.fn(),
    };

    global.navigator = {
        clipboard: {
            writeText: jest.fn(() => Promise.resolve()),
        },
    };

    global.localStorage = {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
    };

    global.URL = {
        createObjectURL: jest.fn(() => 'blob:terminal'),
        revokeObjectURL: jest.fn(),
    };
}

describe('terminal search UI behavior', () => {
    beforeEach(() => {
        jest.resetModules();
        installFakeDom();
    });

    test('terminalEntries returns all match ranges for case-insensitive searches', () => {
        const { findTerminalEntryMatchRanges } = require('../shared/js/terminal/terminalEntries.js');

        expect(findTerminalEntryMatchRanges('Echo: AT Echo: ATI', 'echo')).toEqual([
            { start: 0, end: 4 },
            { start: 9, end: 13 },
        ]);
    });

    test('triggerRules normalizes rules and matches contains and regex patterns', () => {
        const {
            normalizeTriggerRules,
            findMatchingTriggerRules,
        } = require('../shared/js/terminal/triggerRules.js');

        const rules = normalizeTriggerRules([
            { pattern: 'error', scope: 'error', highlight: 'danger' },
            { pattern: '^Echo:', matchType: 'regex', scope: 'rx', highlight: 'info' },
            { pattern: '' },
        ]);

        expect(rules).toHaveLength(2);
        expect(findMatchingTriggerRules({ text: 'Echo: AT', type: 'rx' }, rules)).toEqual([
            expect.objectContaining({ pattern: '^Echo:', highlight: 'info' }),
        ]);
        expect(findMatchingTriggerRules({ text: 'Error: boom', type: 'error' }, rules)).toEqual([
            expect.objectContaining({ pattern: 'error', highlight: 'danger' }),
        ]);
    });

    test('transactions group request-response entries within the transaction window', () => {
        const { assignEntryToTransactions } = require('../shared/js/terminal/transactions.js');
        const baseTime = new Date('2026-03-12T02:00:00.000Z');

        const first = assignEntryToTransactions({
            id: 'entry-1',
            text: '> AT',
            type: 'tx',
            timestamp: baseTime,
        }, []);
        const second = assignEntryToTransactions({
            id: 'entry-2',
            text: 'Echo: AT',
            type: 'rx',
            timestamp: new Date(baseTime.getTime() + 120),
        }, first.transactions);
        const third = assignEntryToTransactions({
            id: 'entry-3',
            text: 'READY',
            type: 'rx',
            timestamp: new Date(baseTime.getTime() + 900),
        }, second.transactions);

        expect(first.entry.transactionId).toBe(first.transactions[0].id);
        expect(second.entry.transactionId).toBe(first.transactions[0].id);
        expect(second.transactions).toHaveLength(1);
        expect(second.transactions[0]).toEqual(expect.objectContaining({
            counts: expect.objectContaining({ tx: 1, rx: 1 }),
            requestEntryId: 'entry-1',
        }));
        expect(third.transactions).toHaveLength(1);
        expect(third.transactions[0]).toEqual(expect.objectContaining({
            counts: expect.objectContaining({ tx: 1, rx: 2 }),
            firstEntryId: 'entry-1',
            lastEntryId: 'entry-3',
            type: 'request-response',
        }));
    });

    test('TerminalComponent tracks search state and navigates between matches', () => {
        const { TerminalComponent } = require('../shared/js/components/TerminalComponent.js');
        const container = new FakeElement('div');
        const states = [];
        const terminal = new TerminalComponent(container, {
            autoScroll: false,
            onSearchStateChange: (state) => states.push(state),
        });

        terminal.appendLine('Echo: AT', 'rx', true);
        terminal.appendLine('Echo: ATI', 'rx', true);
        terminal.setFilters({ search: 'Echo' });

        expect(terminal.getSearchState()).toEqual({ totalMatches: 2, currentMatch: 1 });
        expect(container.querySelector('.terminal-search-current').textContent).toContain('Echo: AT');
        expect(container.querySelectorAll('.terminal-search-match').length).toBe(2);

        terminal.navigateSearchResults(1);

        expect(terminal.getSearchState()).toEqual({ totalMatches: 2, currentMatch: 2 });
        expect(container.querySelector('.terminal-search-current').textContent).toContain('Echo: ATI');
        expect(states.at(-1)).toEqual({ totalMatches: 2, currentMatch: 2 });
    });

    test('TerminalComponent can focus a specific entry by id', () => {
        const { TerminalComponent } = require('../shared/js/components/TerminalComponent.js');
        const container = new FakeElement('div');
        const terminal = new TerminalComponent(container, {
            autoScroll: false,
        });

        terminal.appendLine('Echo: AT', 'rx', true);
        terminal.appendLine('Echo: ATI', 'rx', true);

        const targetEntryId = terminal.entries[1].id;
        expect(terminal.focusEntry(targetEntryId, { search: 'Echo', type: 'all' })).toBe(true);
        expect(terminal.getSearchState()).toEqual({ totalMatches: 2, currentMatch: 2 });
        expect(container.querySelector('.terminal-search-current').textContent).toContain('Echo: ATI');
    });

    test('TerminalComponent applies trigger badges and highlight classes', () => {
        const { TerminalComponent } = require('../shared/js/components/TerminalComponent.js');
        const container = new FakeElement('div');
        const terminal = new TerminalComponent(container, {
            autoScroll: false,
            triggerRules: [
                { pattern: 'Echo:', scope: 'rx', highlight: 'info' },
            ],
        });

        terminal.appendLine('Echo: AT', 'rx', true);

        expect(terminal.entries[0].triggerMatches).toEqual([
            expect.objectContaining({ pattern: 'Echo:', highlight: 'info' }),
        ]);
        expect(container.querySelector('.terminal-trigger-hit')).not.toBeNull();
        expect(container.querySelector('.terminal-trigger-info')).not.toBeNull();
        expect(container.querySelector('.terminal-trigger-badge').textContent).toBe('Echo:');

        terminal.setTriggerRules([{ pattern: 'AT', scope: 'tx', highlight: 'warning' }]);
        expect(terminal.entries[0].triggerMatches).toEqual([]);
    });

    test('TerminalComponent tracks transactions and emits transaction updates', () => {
        const { TerminalComponent } = require('../shared/js/components/TerminalComponent.js');
        const container = new FakeElement('div');
        const transactionStates = [];
        const terminal = new TerminalComponent(container, {
            autoScroll: false,
            onTransactionsChange: (transactions) => transactionStates.push(transactions),
        });

        terminal.appendTransmitted('AT');
        terminal.appendData('Echo: AT\n', 'rx');

        expect(terminal.getTransactions()).toHaveLength(1);
        expect(terminal.getTransactions()[0]).toEqual(expect.objectContaining({
            counts: expect.objectContaining({ tx: 1, rx: 1 }),
        }));
        expect(transactionStates.at(-1)).toHaveLength(1);
        expect(terminal.entries[0].transactionId).toBe(terminal.entries[1].transactionId);
    });

    test('TerminalComponent can star, copy, and export a transaction', async () => {
        const { TerminalComponent } = require('../shared/js/components/TerminalComponent.js');
        const container = new FakeElement('div');
        const terminal = new TerminalComponent(container, {
            autoScroll: false,
        });

        terminal.appendTransmitted('AT');
        terminal.appendData('Echo: AT\n', 'rx');

        const [transaction] = terminal.getTransactions();
        expect(transaction.starred).toBe(false);

        const updated = terminal.toggleTransactionStar(transaction.id);
        expect(updated.starred).toBe(true);
        expect(terminal.formatTransactionContent(transaction.id)).toContain('[TX] > AT');
        expect(terminal.formatTransactionContent(transaction.id)).toContain('[RX] Echo: AT');

        await terminal.copyTransaction(transaction.id);
        expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringContaining('[TX] > AT')
        );

        await expect(terminal.exportTransaction(transaction.id)).resolves.toBe(true);
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalled();
        expect(global.document.body.children).toHaveLength(0);
    });

    test('TerminalComponent can rename a transaction summary', () => {
        const { TerminalComponent } = require('../shared/js/components/TerminalComponent.js');
        const container = new FakeElement('div');
        const terminal = new TerminalComponent(container, {
            autoScroll: false,
        });

        terminal.appendTransmitted('AT');
        terminal.appendData('Echo: AT\n', 'rx');

        const [transaction] = terminal.getTransactions();
        const updated = terminal.renameTransaction(transaction.id, 'Handshake');
        expect(updated.summary).toBe('Handshake');
        expect(terminal.getTransactions()[0].summary).toBe('Handshake');
    });

    test('TerminalComponent can format failure reasons and export multiple transactions', async () => {
        const { TerminalComponent } = require('../shared/js/components/TerminalComponent.js');
        const container = new FakeElement('div');
        const terminal = new TerminalComponent(container, {
            autoScroll: false,
        });

        terminal.appendTransmitted('AT');
        terminal.appendError('Timeout waiting for READY');
        terminal.appendTransmitted('ATI');
        terminal.appendData('Echo: ATI\n', 'rx');

        const transactions = terminal.getTransactions();
        expect(terminal.getTransactionFailureReason(transactions[0].id)).toContain('Timeout waiting for READY');
        expect(terminal.formatTransactionsContent(transactions.map((item) => item.id))).toContain('=== > AT');

        await expect(terminal.exportTransactions(transactions.map((item) => item.id))).resolves.toBe(true);
        expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    test('TerminalComponent delegates saving to the injected save handler when provided', async () => {
        const { TerminalComponent } = require('../shared/js/components/TerminalComponent.js');
        const container = new FakeElement('div');
        const saveContent = jest.fn(() => Promise.resolve(true));
        const terminal = new TerminalComponent(container, {
            autoScroll: false,
            saveContent,
        });

        terminal.appendTransmitted('AT');

        await expect(terminal.saveToFile('terminal.txt')).resolves.toBe(true);
        expect(saveContent).toHaveBeenCalledWith(expect.stringContaining('> AT'), 'terminal.txt');
        expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    });

    test('TabComponent updates search count and restores filter state', () => {
        const { TabComponent } = require('../shared/js/components/TabComponent.js');
        const searchCount = new FakeElement('span');
        const prevButton = new FakeElement('button');
        const nextButton = new FakeElement('button');
        const searchInput = new FakeElement('input');
        const allButton = new FakeElement('button');
        const txButton = new FakeElement('button');
        allButton.dataset.filterType = 'all';
        txButton.dataset.filterType = 'tx';

        const tab = new TabComponent({
            id: 'tab-1',
            filterState: {
                search: 'Echo',
                type: 'tx',
            },
        });

        tab.element = {
            querySelector(selector) {
                if (selector === '.terminal-search-count') {
                    return searchCount;
                }
                if (selector === '.terminal-search-input') {
                    return searchInput;
                }
                return null;
            },
            querySelectorAll(selector) {
                if (selector === '.terminal-nav-btn') {
                    return [prevButton, nextButton];
                }
                if (selector === '.terminal-filter-btn') {
                    return [allButton, txButton];
                }
                return [];
            },
        };
        tab.terminal = {
            getSearchState: () => ({ totalMatches: 2, currentMatch: 1 }),
            setFilters: jest.fn(),
            setTriggerRules: jest.fn(),
            getTriggerRules: jest.fn(() => []),
            getTransactions: jest.fn(() => []),
        };

        tab.updateSearchState();
        expect(searchCount.textContent).toBe('1 / 2');
        expect(prevButton.disabled).toBe(false);
        expect(nextButton.disabled).toBe(false);

        tab.restoreTerminalState();
        expect(searchInput.value).toBe('Echo');
        expect(txButton.classList.contains('active')).toBe(true);
        expect(allButton.classList.contains('active')).toBe(false);
        expect(tab.terminal.setFilters).toHaveBeenCalledWith({
            search: 'Echo',
            type: 'tx',
        });
    });
});
