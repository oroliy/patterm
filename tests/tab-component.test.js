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
        this.hidden = false;
        this.children = [];
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

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this[name] = value;
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
        global.window = {
            prompt: jest.fn(),
        };
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('handleSend preserves formatting and only sends non-empty input when connected', async () => {
        const { TabComponent } = require('../shared/js/components/TabComponent.js');
        const inputField = new FakeElement();
        const onSend = jest.fn();
        const tab = new TabComponent({
            id: 'tab-1',
            connected: true,
        }, { onSend });

        inputField.value = '  AT+RST\r\nNEXT  ';
        tab.element = {
            querySelector(selector) {
                if (selector === '.input-field') {
                    return inputField;
                }
                return null;
            },
        };

        await tab.handleSend();
        expect(onSend).toHaveBeenCalledWith('tab-1', '  AT+RST\r\nNEXT  ');
        expect(inputField.value).toBe('');

        inputField.value = '   \n  ';
        await tab.handleSend();
        expect(onSend).toHaveBeenCalledTimes(1);

        tab.tabState.connected = false;
        inputField.value = 'AT';
        await tab.handleSend();
        expect(onSend).toHaveBeenCalledTimes(1);
    });

    test('updateConnectionState toggles controls and labels', () => {
        const { TabComponent } = require('../shared/js/components/TabComponent.js');
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
        const { TabComponent } = require('../shared/js/components/TabComponent.js');
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

    test('updateStatusBar, updatePortName, setName, filters, triggers, workflows, transactions, and destroy update the view', async () => {
        const { TabComponent } = require('../shared/js/components/TabComponent.js');
        const tabName = new FakeElement();
        const searchInput = new FakeElement();
        const allButton = new FakeElement();
        const errorButton = new FakeElement();
        const triggerPattern = new FakeElement();
        const triggerMatchType = new FakeElement();
        const triggerScope = new FakeElement();
        const triggerHighlight = new FakeElement();
        const triggerList = new FakeElement();
        const triggerEmpty = new FakeElement();
        const triggerPanel = new FakeElement();
        const workflowName = new FakeElement();
        const workflowSend = new FakeElement();
        const workflowWait = new FakeElement();
        const workflowMatchType = new FakeElement();
        const workflowScope = new FakeElement();
        const workflowTimeout = new FakeElement();
        const workflowList = new FakeElement();
        const workflowEmpty = new FakeElement();
        const workflowPanel = new FakeElement();
        const workflowStatus = new FakeElement();
        const workflowCurrentStep = new FakeElement();
        const transactionList = new FakeElement();
        const transactionEmpty = new FakeElement();
        const transactionPanel = new FakeElement();
        const transactionFilterAll = new FakeElement();
        const transactionFilterFailed = new FakeElement();
        const transactionFilterStarred = new FakeElement();
        const transactionExportVisible = new FakeElement();
        const rxBytes = new FakeElement();
        const txBytes = new FakeElement();
        const duration = new FakeElement();
        const currentTime = new FakeElement();
        const rxRate = new FakeElement();
        const txRate = new FakeElement();

        allButton.dataset.filterType = 'all';
        errorButton.dataset.filterType = 'error';
        transactionFilterAll.dataset.transactionFilter = 'all';
        transactionFilterFailed.dataset.transactionFilter = 'failed';
        transactionFilterStarred.dataset.transactionFilter = 'starred';

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
            workflows: [{
                id: 'workflow-1',
                name: 'Handshake',
                steps: [
                    { id: 'step-1', type: 'send', payload: 'AT' },
                    { id: 'step-2', type: 'waitForMatch', pattern: 'Echo: AT', matchType: 'contains', scope: 'rx', timeoutMs: 2000 },
                ],
            }],
            workflowRuntime: {
                workflowId: 'workflow-1',
                status: 'running',
                currentStepIndex: 1,
                completedStepIds: ['step-1'],
                error: null,
            },
            transactions: [
                {
                    id: 'transaction-1',
                    type: 'request-response',
                    summary: '> AT',
                    starred: false,
                    firstEntryId: 'entry-1',
                    counts: {
                        tx: 1,
                        rx: 1,
                        error: 0,
                        info: 0,
                    },
                },
                {
                    id: 'transaction-2',
                    type: 'passive',
                    summary: 'FAIL',
                    starred: true,
                    firstEntryId: 'entry-2',
                    counts: {
                        tx: 0,
                        rx: 0,
                        error: 1,
                        info: 0,
                    },
                },
            ],
        });

        tab.element = {
            style: {},
            querySelector(selector) {
                if (selector === '.terminal-search-count') return new FakeElement();
                if (selector === '.terminal-search-input') return searchInput;
                if (selector === '.terminal-trigger-pattern-input') return triggerPattern;
                if (selector === '.terminal-trigger-match-type') return triggerMatchType;
                if (selector === '.terminal-trigger-scope') return triggerScope;
                if (selector === '.terminal-trigger-highlight') return triggerHighlight;
                if (selector === '.terminal-trigger-list') return triggerList;
                if (selector === '.terminal-trigger-empty') return triggerEmpty;
                if (selector === '.terminal-trigger-panel') return triggerPanel;
                if (selector === '.terminal-workflow-name-input') return workflowName;
                if (selector === '.terminal-workflow-send-input') return workflowSend;
                if (selector === '.terminal-workflow-wait-input') return workflowWait;
                if (selector === '.terminal-workflow-match-type') return workflowMatchType;
                if (selector === '.terminal-workflow-scope') return workflowScope;
                if (selector === '.terminal-workflow-timeout-input') return workflowTimeout;
                if (selector === '.terminal-workflow-list') return workflowList;
                if (selector === '.terminal-workflow-empty') return workflowEmpty;
                if (selector === '.terminal-workflow-panel') return workflowPanel;
                if (selector === '.terminal-workflow-status') return workflowStatus;
                if (selector === '.terminal-workflow-current-step') return workflowCurrentStep;
                if (selector === '.terminal-transaction-list') return transactionList;
                if (selector === '.terminal-transaction-empty') return transactionEmpty;
                if (selector === '.terminal-transaction-panel') return transactionPanel;
                if (selector === '.terminal-transaction-export-visible-btn') return transactionExportVisible;
                return null;
            },
            querySelectorAll(selector) {
                if (selector === '.terminal-nav-btn') return [new FakeElement(), new FakeElement()];
                if (selector === '.terminal-filter-btn') return [allButton, errorButton];
                if (selector === '.terminal-transaction-filter-btn') {
                    return [transactionFilterAll, transactionFilterFailed, transactionFilterStarred];
                }
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
            getTriggerRules: jest.fn(() => [{ id: 'trigger-1', name: 'Echo:', scope: 'rx', matchType: 'contains', highlight: 'info' }]),
            setTriggerRules: jest.fn(() => [{ id: 'trigger-1', name: 'Echo:', scope: 'rx', matchType: 'contains', highlight: 'info' }]),
            getTransactions: jest.fn(() => tab.tabState.transactions),
            focusEntry: jest.fn(),
            copyTransaction: jest.fn(() => Promise.resolve()),
            exportTransaction: jest.fn(() => Promise.resolve(true)),
            toggleTransactionStar: jest.fn(() => ({ ...tab.tabState.transactions[0], starred: true })),
            renameTransaction: jest.fn((id, summary) => ({ ...tab.tabState.transactions[0], id, summary })),
            getTransactionFailureReason: jest.fn((id) => id === 'transaction-2' ? 'Error: timeout' : ''),
            exportTransactions: jest.fn(() => Promise.resolve(true)),
            appendInfo: jest.fn(),
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
        expect(transactionList.children).toHaveLength(2);
        expect(transactionEmpty.style.display).toBe('none');
        expect(transactionList.children[0].children[2].textContent).toContain('Error: timeout');
        expect(workflowList.children).toHaveLength(1);
        expect(workflowEmpty.style.display).toBe('none');
        expect(workflowStatus.textContent).toBe('Running');
        expect(workflowCurrentStep.textContent).toBe('Waiting for Echo: AT');
        expect(tab.terminal.setTriggerRules).toHaveBeenCalledWith(tab.tabState.triggerRules || []);
        expect(triggerList.children).toHaveLength(1);
        expect(triggerEmpty.style.display).toBe('none');

        triggerPattern.value = 'READY';
        triggerMatchType.value = 'contains';
        triggerScope.value = 'rx';
        triggerHighlight.value = 'success';
        tab.terminal.setTriggerRules.mockReturnValueOnce([
            { id: 'trigger-1', name: 'Echo:', scope: 'rx', matchType: 'contains', highlight: 'info' },
            { id: 'trigger-2', name: 'READY', scope: 'rx', matchType: 'contains', highlight: 'success' },
        ]);
        tab.options.onTriggerRulesChange = jest.fn();

        tab.addTriggerRuleFromInputs();
        expect(tab.terminal.setTriggerRules).toHaveBeenCalledWith([
            { id: 'trigger-1', name: 'Echo:', scope: 'rx', matchType: 'contains', highlight: 'info' },
            { pattern: 'READY', matchType: 'contains', scope: 'rx', highlight: 'success' },
        ]);
        expect(tab.options.onTriggerRulesChange).toHaveBeenCalledWith('tab-1', expect.any(Array));
        expect(triggerPattern.value).toBe('');

        tab.terminal.getTriggerRules.mockReturnValue([
            { id: 'trigger-1', name: 'Echo:', scope: 'rx', matchType: 'contains', highlight: 'info' },
            { id: 'trigger-2', name: 'READY', scope: 'rx', matchType: 'contains', highlight: 'success' },
        ]);
        tab.terminal.setTriggerRules.mockReturnValueOnce([
            { id: 'trigger-2', name: 'READY', scope: 'rx', matchType: 'contains', highlight: 'success' },
        ]);
        tab.removeTriggerRule('trigger-1');
        expect(tab.terminal.setTriggerRules).toHaveBeenLastCalledWith([
            { id: 'trigger-2', name: 'READY', scope: 'rx', matchType: 'contains', highlight: 'success' },
        ]);

        tab.toggleTriggerPanel(true);
        expect(triggerPanel.hidden).toBe(false);
        tab.toggleTriggerPanel(false);
        expect(triggerPanel.hidden).toBe(true);

        workflowName.value = 'Boot';
        workflowSend.value = 'ATZ';
        workflowWait.value = 'READY';
        workflowMatchType.value = 'contains';
        workflowScope.value = 'rx';
        workflowTimeout.value = '1500';
        tab.options.onWorkflowDefinitionsChange = jest.fn();
        tab.addWorkflowFromInputs();
        expect(tab.options.onWorkflowDefinitionsChange).toHaveBeenCalledWith('tab-1', expect.any(Array));
        expect(workflowSend.value).toBe('');
        expect(workflowWait.value).toBe('');
        expect(workflowList.children.length).toBeGreaterThan(1);

        tab.updateWorkflowRuntime({
            workflowId: 'workflow-1',
            status: 'failed',
            currentStepIndex: 1,
            completedStepIds: ['step-1'],
            error: 'Timeout waiting for Echo: AT',
        });
        expect(workflowStatus.textContent).toBe('Failed');
        expect(workflowCurrentStep.textContent).toBe('Timeout waiting for Echo: AT');

        tab.toggleWorkflowPanel(true);
        expect(workflowPanel.hidden).toBe(false);
        tab.toggleWorkflowPanel(false);
        expect(workflowPanel.hidden).toBe(true);

        tab.updateTransactions([{
            id: 'transaction-2',
            type: 'passive',
            summary: 'READY',
            starred: false,
            firstEntryId: 'entry-3',
            counts: {
                tx: 0,
                rx: 1,
                error: 0,
                info: 0,
            },
        }]);
        expect(transactionList.children).toHaveLength(1);
        expect(transactionList.children[0].children[3].children).toHaveLength(5);

        tab.toggleTransactionPanel(true);
        expect(transactionPanel.hidden).toBe(false);
        tab.toggleTransactionPanel(false);
        expect(transactionPanel.hidden).toBe(true);

        await Promise.all([
            tab.copyTransaction('transaction-2'),
            tab.exportTransaction('transaction-2'),
        ]);
        await tab.exportVisibleTransactions();
        tab.toggleTransactionStar('transaction-2');
        expect(tab.terminal.copyTransaction).toHaveBeenCalledWith('transaction-2');
        expect(tab.terminal.exportTransaction).toHaveBeenCalledWith('transaction-2');
        expect(tab.terminal.exportTransactions).toHaveBeenCalledWith(['transaction-2']);
        expect(tab.terminal.toggleTransactionStar).toHaveBeenCalledWith('transaction-2');
        expect(tab.terminal.appendInfo).toHaveBeenCalledWith('Transaction copied');
        expect(tab.terminal.appendInfo).toHaveBeenCalledWith('Transaction exported');
        expect(tab.terminal.appendInfo).toHaveBeenCalledWith('Visible transactions exported');
        global.window.prompt.mockReturnValueOnce('Renamed block');
        tab.renameTransaction('transaction-2');
        expect(tab.terminal.renameTransaction).toHaveBeenCalledWith('transaction-2', 'Renamed block');

        tab.updateTransactions([
            {
                id: 'transaction-1',
                type: 'request-response',
                summary: 'OK',
                starred: false,
                firstEntryId: 'entry-1',
                counts: { tx: 1, rx: 1, error: 0, info: 0 },
            },
            {
                id: 'transaction-2',
                type: 'passive',
                summary: 'FAIL',
                starred: true,
                firstEntryId: 'entry-2',
                counts: { tx: 0, rx: 0, error: 1, info: 0 },
            },
        ]);
        tab.setTransactionFilter('failed');
        expect(transactionFilterFailed.classList.contains('active')).toBe(true);
        expect(transactionList.children).toHaveLength(1);
        expect(transactionList.children[0].children[0].textContent).toContain('FAIL');

        tab.setTransactionFilter('starred');
        expect(transactionFilterStarred.classList.contains('active')).toBe(true);
        expect(transactionList.children).toHaveLength(1);
        expect(transactionList.children[0].children[0].textContent).toContain('★');

        tab.destroy();
        expect(tab.element.remove).toHaveBeenCalled();
        expect(tab.tabElement.remove).toHaveBeenCalled();
    });

    test('attachEventListeners routes close, switch, send, clear, search, nav, workflow, trigger, and context menu actions', async () => {
        const { TabComponent } = require('../shared/js/components/TabComponent.js');
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
        const transactionButton = new FakeElement();
        const transactionFilterFailed = new FakeElement();
        const transactionExportVisible = new FakeElement();
        const transactionCloseButton = new FakeElement();
        const workflowButton = new FakeElement();
        const workflowCloseButton = new FakeElement();
        const workflowAddButton = new FakeElement();
        const triggerButton = new FakeElement();
        const triggerCloseButton = new FakeElement();
        const triggerAddButton = new FakeElement();
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
        transactionFilterFailed.dataset.transactionFilter = 'failed';

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
                if (selector === '.terminal-transaction-btn') return transactionButton;
                if (selector === '.terminal-transaction-export-visible-btn') return transactionExportVisible;
                if (selector === '.terminal-transaction-close-btn') return transactionCloseButton;
                if (selector === '.terminal-workflow-btn') return workflowButton;
                if (selector === '.terminal-workflow-close-btn') return workflowCloseButton;
                if (selector === '.terminal-workflow-add-btn') return workflowAddButton;
                if (selector === '.terminal-trigger-btn') return triggerButton;
                if (selector === '.terminal-trigger-close-btn') return triggerCloseButton;
                if (selector === '.terminal-trigger-add-btn') return triggerAddButton;
                return null;
            },
            querySelectorAll(selector) {
                if (selector === '.terminal-nav-btn') return [prevButton, nextButton];
                if (selector === '.terminal-filter-btn') return [allButton, txButton];
                if (selector === '.terminal-transaction-filter-btn') return [transactionFilterFailed];
                return [];
            },
        };
        tab.getFilterState = jest.fn(() => ({ search: 'AT', type: 'tx' }));
        tab.updateSearchState = jest.fn();
        tab.toggleTransactionPanel = jest.fn();
        tab.setTransactionFilter = jest.fn();
        tab.exportVisibleTransactions = jest.fn();
        tab.toggleWorkflowPanel = jest.fn();
        tab.addWorkflowFromInputs = jest.fn();
        tab.toggleTriggerPanel = jest.fn();
        tab.addTriggerRuleFromInputs = jest.fn();
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
        inputField.value = 'ATI\nNEXT';
        inputField.listeners.get('keydown')({
            key: 'Enter',
            ctrlKey: true,
            metaKey: false,
            preventDefault: jest.fn(),
        });
        clearBtn.listeners.get('click')();
        terminalDisplay.listeners.get('contextmenu')({ preventDefault: jest.fn(), type: 'contextmenu' });
        searchInput.listeners.get('input')({ target: { value: 'ERR' } });
        searchInput.listeners.get('keydown')({ key: 'Enter', preventDefault: jest.fn(), shiftKey: true });
        prevButton.listeners.get('click')();
        nextButton.listeners.get('click')();
        txButton.listeners.get('click')();
        transactionButton.listeners.get('click')();
        transactionFilterFailed.listeners.get('click')();
        transactionExportVisible.listeners.get('click')();
        transactionCloseButton.listeners.get('click')();
        workflowButton.listeners.get('click')();
        workflowCloseButton.listeners.get('click')();
        workflowAddButton.listeners.get('click')();
        triggerButton.listeners.get('click')();
        triggerCloseButton.listeners.get('click')();
        triggerAddButton.listeners.get('click')();

        expect(onClose).toHaveBeenCalledWith('tab-1');
        expect(onSwitch).toHaveBeenCalledWith('tab-1');
        expect(onSend).toHaveBeenCalledWith('tab-1', 'AT');
        expect(onSend).toHaveBeenCalledWith('tab-1', 'ATI\nNEXT');
        expect(onClear).toHaveBeenCalledWith('tab-1');
        expect(onContextMenu).toHaveBeenCalledWith('tab-1', expect.objectContaining({ type: 'contextmenu' }));
        expect(tab.terminal.setFilters).toHaveBeenCalledWith({ search: 'ERR' });
        expect(tab.terminal.setFilters).toHaveBeenCalledWith({ type: 'tx' });
        expect(tab.terminal.navigateSearchResults).toHaveBeenCalledWith(-1);
        expect(tab.terminal.navigateSearchResults).toHaveBeenCalledWith(1);
        expect(onFiltersChange).toHaveBeenCalledWith('tab-1', { search: 'AT', type: 'tx' });
        expect(tab.toggleTransactionPanel).toHaveBeenCalledWith();
        expect(tab.setTransactionFilter).toHaveBeenCalledWith('failed');
        expect(tab.exportVisibleTransactions).toHaveBeenCalled();
        expect(tab.toggleTransactionPanel).toHaveBeenCalledWith(false);
        expect(tab.toggleWorkflowPanel).toHaveBeenCalledWith();
        expect(tab.toggleWorkflowPanel).toHaveBeenCalledWith(false);
        expect(tab.addWorkflowFromInputs).toHaveBeenCalled();
        expect(tab.toggleTriggerPanel).toHaveBeenCalledWith();
        expect(tab.toggleTriggerPanel).toHaveBeenCalledWith(false);
        expect(tab.addTriggerRuleFromInputs).toHaveBeenCalled();
    });

    test('focusSearchResult updates local filters and targets a specific entry', () => {
        const { TabComponent } = require('../shared/js/components/TabComponent.js');
        const searchInput = new FakeElement();
        const allButton = new FakeElement();
        const rxButton = new FakeElement();
        const tab = new TabComponent({ id: 'tab-1' });

        allButton.dataset.filterType = 'all';
        rxButton.dataset.filterType = 'rx';

        tab.element = {
            querySelector(selector) {
                if (selector === '.terminal-search-input') {
                    return searchInput;
                }
                if (selector === '.terminal-search-count') {
                    return new FakeElement();
                }
                return null;
            },
            querySelectorAll(selector) {
                if (selector === '.terminal-filter-btn') {
                    return [allButton, rxButton];
                }
                if (selector === '.terminal-nav-btn') {
                    return [new FakeElement(), new FakeElement()];
                }
                return [];
            },
        };
        tab.updateSearchState = jest.fn();
        tab.focusSearch = jest.fn();
        tab.terminal = {
            focusEntry: jest.fn(() => true),
        };

        tab.focusSearchResult('Echo', 'rx', 'entry-2');

        expect(searchInput.value).toBe('Echo');
        expect(rxButton.classList.contains('active')).toBe(true);
        expect(allButton.classList.contains('active')).toBe(false);
        expect(tab.terminal.focusEntry).toHaveBeenCalledWith('entry-2', {
            search: 'Echo',
            type: 'rx',
        });
        expect(tab.updateSearchState).toHaveBeenCalled();
        expect(tab.focusSearch).toHaveBeenCalled();
    });
});
