jest.mock('../shared/js/services/TabManager.js', () => {
    const createManager = () => ({
        getActiveTab: jest.fn(() => ({ id: 'tab-1' })),
        getAllTabs: jest.fn(() => []),
        createTab: jest.fn(),
        switchTab: jest.fn(),
        closeTab: jest.fn(),
        clearTerminal: jest.fn(),
        updateFilterState: jest.fn(),
        updateTriggerRules: jest.fn((_tabId, rules) => rules),
        updateWorkflows: jest.fn((_tabId, workflows) => workflows.map((workflow, index) => ({
            id: workflow.id || `workflow-${index}`,
            ...workflow,
        }))),
        updateWorkflowRuntime: jest.fn((_tabId, runtime) => runtime),
        getTab: jest.fn(() => null),
        getTabConfig: jest.fn(() => null),
        onDataSent: jest.fn(),
    });

    return {
        TabManager: jest.fn(() => createManager()),
    };
});

jest.mock('../shared/js/components/TabComponent.js', () => ({
    TabComponent: jest.fn(() => ({
        create: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
        setActive: jest.fn(),
        updateConnectionState: jest.fn(),
        updatePortName: jest.fn(),
        updateStatusBar: jest.fn(),
        updateRates: jest.fn(),
        focusSearch: jest.fn(),
        tabElement: {
            remove: jest.fn(),
        },
        element: {
            remove: jest.fn(),
        },
        terminal: {
            appendData: jest.fn(),
            appendError: jest.fn(),
            copyAll: jest.fn(() => Promise.resolve()),
        },
        getFilterState: jest.fn(() => ({ search: '', type: 'all' })),
        renderWorkflows: jest.fn(),
        renderWorkflowRuntime: jest.fn(),
        updateWorkflowRuntime: jest.fn(),
        toggleWorkflowPanel: jest.fn(),
    })),
}));

jest.mock('../shared/js/services/EventManager.js', () => ({
    globalEvents: {
        on: jest.fn(),
    },
}));

jest.mock('../shared/js/helpers.js', () => ({
    applyTheme: jest.fn(),
    getEffectiveTheme: jest.fn((theme) => theme === 'system' ? 'dark' : theme),
    saveToLocalStorage: jest.fn(),
    loadFromLocalStorage: jest.fn(() => 'system'),
}));

class FakeElement {
    constructor() {
        this.style = {};
        this.value = '';
        this.children = [];
        this.innerHTML = '';
        this.textContent = '';
        this.dataset = {};
        this.classList = {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn(),
        };
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    setAttribute(name, value) {
        this[name] = value;
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    querySelector(selector) {
        if (selector === '.context-menu-items') {
            if (!this.menuItems) {
                this.menuItems = new FakeElement();
            }
            return this.menuItems;
        }
        return null;
    }

    querySelectorAll() {
        return [];
    }

    focus() {
        this.focused = true;
    }
}

function installFakeDocument() {
    const elements = new Map();
    const ids = [
        'new-tab-btn',
        'empty-new-connection-btn',
        'theme-toggle-btn',
        'command-palette-btn',
        'about-btn',
        'tabs-container',
        'tabs-content',
        'empty-state',
        'context-menu',
        'theme-menu',
        'command-palette',
        'command-palette-input',
        'command-palette-list',
        'global-search',
        'global-search-input',
        'global-search-list',
    ];

    ids.forEach((id) => elements.set(id, new FakeElement()));

    global.document = {
        getElementById: (id) => elements.get(id) || null,
        createElement: () => new FakeElement(),
        addEventListener: jest.fn(),
        body: new FakeElement(),
    };

    return elements;
}

describe('AppShell behavior', () => {
    beforeEach(() => {
        jest.resetModules();
        installFakeDocument();
    });

    test('toggleTheme cycles theme, applies it, and persists session', () => {
        const { applyTheme, saveToLocalStorage } = require('../shared/js/helpers.js');
        const { STORAGE_KEYS } = require('../shared/js/constants.js');
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        shell.persistSession = jest.fn();

        shell.toggleTheme();

        expect(shell.theme).toBe('dark');
        expect(saveToLocalStorage).toHaveBeenCalledWith(STORAGE_KEYS.THEME, 'dark');
        expect(applyTheme).toHaveBeenCalledWith('dark', 'default');
        expect(shell.persistSession).toHaveBeenCalled();
    });

    test('filterCommands narrows palette results and resets selection', () => {
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        shell.commandPaletteList = new FakeElement();
        shell.registerCommandPaletteCommands();
        shell.selectedCommandIndex = 3;

        shell.filterCommands('theme');

        expect(shell.selectedCommandIndex).toBe(0);
        expect(shell.filteredCommands.map((command) => command.id)).toEqual([
            'toggle-theme',
            'cycle-theme-preset',
        ]);
        expect(shell.commandPaletteList.children.length).toBe(2);
    });

    test('serializeSession and restoreSession round-trip tab metadata', () => {
        const helpers = require('../shared/js/helpers.js');
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        const createdTime = new Date('2026-03-11T10:00:00.000Z');

        shell.tabManager.getAllTabs.mockReturnValue([
            {
                id: 'tab-1',
                name: 'Main',
                config: { baudRate: 115200 },
                autoScroll: true,
                createdTime,
                filterState: { search: 'Echo', type: 'tx' },
                triggerRules: [{ id: 'trigger-1', pattern: 'READY', scope: 'rx', highlight: 'success' }],
                workflows: [{
                    id: 'workflow-1',
                    name: 'Handshake',
                    steps: [
                        { id: 'step-1', type: 'send', payload: 'AT' },
                        { id: 'step-2', type: 'waitForMatch', pattern: 'Echo: AT', matchType: 'contains', scope: 'rx', timeoutMs: 2000 },
                    ],
                }],
            },
        ]);

        const session = shell.serializeSession();
        expect(session).toEqual({
            activeTabId: 'tab-1',
            tabs: [
                {
                    id: 'tab-1',
                    name: 'Main',
                    config: { baudRate: 115200 },
                    connected: false,
                    autoScroll: true,
                    createdTime: createdTime.toISOString(),
                    filterState: { search: 'Echo', type: 'tx' },
                    triggerRules: [{ id: 'trigger-1', pattern: 'READY', scope: 'rx', highlight: 'success' }],
                    workflows: [{
                        id: 'workflow-1',
                        name: 'Handshake',
                        steps: [
                            { id: 'step-1', type: 'send', payload: 'AT' },
                            { id: 'step-2', type: 'waitForMatch', pattern: 'Echo: AT', matchType: 'contains', scope: 'rx', timeoutMs: 2000 },
                        ],
                    }],
                },
            ],
        });

        shell.tabComponents.set('tab-1', {});
        helpers.loadFromLocalStorage.mockReturnValue(session);
        shell.shouldPersistSession = () => true;
        shell.restoreSession();

        expect(shell.tabManager.createTab).toHaveBeenCalledWith(
            { baudRate: 115200 },
            'Main',
            expect.objectContaining({
                id: 'tab-1',
                createdTime: createdTime.toISOString(),
                filterState: { search: 'Echo', type: 'tx' },
                triggerRules: [{ id: 'trigger-1', pattern: 'READY', scope: 'rx', highlight: 'success' }],
                workflows: [{
                    id: 'workflow-1',
                    name: 'Handshake',
                    steps: [
                        { id: 'step-1', type: 'send', payload: 'AT' },
                        { id: 'step-2', type: 'waitForMatch', pattern: 'Echo: AT', matchType: 'contains', scope: 'rx', timeoutMs: 2000 },
                    ],
                }],
            })
        );
        expect(shell.tabManager.switchTab).toHaveBeenCalledWith('tab-1');
    });

    test('updateEmptyState toggles empty view based on tab count', () => {
        const elements = installFakeDocument();
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();

        shell.tabComponents.clear();
        shell.updateEmptyState();
        expect(elements.get('empty-state').style.display).toBe('flex');
        expect(elements.get('tabs-content').style.display).toBe('none');

        shell.tabComponents.set('tab-1', {});
        shell.updateEmptyState();
        expect(elements.get('empty-state').style.display).toBe('none');
        expect(elements.get('tabs-content').style.display).toBe('block');
    });

    test('handleGlobalKeydown routes command palette shortcuts', () => {
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        shell.toggleCommandPalette = jest.fn();
        shell.closeCommandPalette = jest.fn();
        shell.moveCommandSelection = jest.fn();
        shell.executeSelectedCommand = jest.fn();
        shell.isCommandPaletteOpen = jest.fn(() => true);

        const shortcutEvent = { ctrlKey: true, key: 'k', preventDefault: jest.fn() };
        shell.handleGlobalKeydown(shortcutEvent);
        expect(shell.toggleCommandPalette).toHaveBeenCalled();

        const escapeEvent = { key: 'Escape', preventDefault: jest.fn() };
        shell.handleGlobalKeydown(escapeEvent);
        expect(shell.closeCommandPalette).toHaveBeenCalled();

        const downEvent = { key: 'ArrowDown', preventDefault: jest.fn() };
        shell.handleGlobalKeydown(downEvent);
        expect(shell.moveCommandSelection).toHaveBeenCalledWith(1);

        const enterEvent = { key: 'Enter', preventDefault: jest.fn() };
        shell.handleGlobalKeydown(enterEvent);
        expect(shell.executeSelectedCommand).toHaveBeenCalled();
    });

    test('onTabCreated mounts component and persists session', () => {
        const { TabComponent } = require('../shared/js/components/TabComponent.js');
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        shell.persistSession = jest.fn();
        shell.switchTab = jest.fn();
        shell.updateEmptyState = jest.fn();

        const tabState = { id: 'tab-1', name: 'Main', connected: false };
        shell.onTabCreated(tabState);

        expect(TabComponent).toHaveBeenCalledWith(
            tabState,
            expect.objectContaining({
                onClose: expect.any(Function),
                onSwitch: expect.any(Function),
                onSend: expect.any(Function),
            })
        );
        expect(shell.tabComponents.has('tab-1')).toBe(true);
        expect(shell.switchTab).toHaveBeenCalledWith('tab-1');
        expect(shell.persistSession).toHaveBeenCalled();
    });

    test('focusActiveTabSearch and executeCommand delegate to active component', () => {
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        const component = { focusSearch: jest.fn() };

        shell.tabComponents.set('tab-1', component);
        shell.focusActiveTabSearch();
        expect(component.focusSearch).toHaveBeenCalled();

        const run = jest.fn();
        shell.closeCommandPalette = jest.fn();
        shell.executeCommand({ run });
        expect(shell.closeCommandPalette).toHaveBeenCalled();
        expect(run).toHaveBeenCalled();
    });

    test('command palette open, close, navigation, and empty state rendering work', () => {
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        shell.initContextMenu();

        shell.openCommandPalette();
        expect(shell.commandPalette.style.display).toBe('flex');
        expect(shell.commandPaletteInput.focused).toBe(true);
        expect(shell.filteredCommands.length).toBe(shell.commandPaletteCommands.length);

        shell.moveCommandSelection(1);
        expect(shell.selectedCommandIndex).toBe(1);

        shell.filterCommands('missing');
        expect(shell.filteredCommands).toEqual([]);
        expect(shell.commandPaletteList.children.length).toBeGreaterThan(0);

        shell.closeCommandPalette();
        expect(shell.commandPalette.style.display).toBe('none');
        expect(shell.commandPaletteInput.value).toBe('');
    });

    test('context menu, copy, errors, and session persistence branches are covered', async () => {
        const helpers = require('../shared/js/helpers.js');
        const { STORAGE_KEYS } = require('../shared/js/constants.js');
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        const event = { pageX: 10, pageY: 20 };
        const action = jest.fn();
        const failingComponent = {
            terminal: {
                copyAll: jest.fn(() => Promise.reject(new Error('copy failed'))),
            },
        };

        shell.initContextMenu();
        shell.showContextMenu(event, [{ label: 'Copy', action }]);
        expect(shell.contextMenu.style.display).toBe('block');
        expect(shell.contextMenu.style.left).toBe('10px');
        expect(shell.contextMenu.style.top).toBe('20px');
        expect(shell.contextMenu.querySelector('.context-menu-items').children.length).toBe(1);

        shell.hideContextMenu();
        expect(shell.contextMenu.style.display).toBe('none');

        shell.tabComponents.set('tab-1', failingComponent);
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        await shell.copyTabContent('tab-1');
        await shell.copyTabContent('missing');
        expect(consoleSpy).toHaveBeenCalled();

        shell.showError('Bad things');
        expect(document.body.children.length).toBeGreaterThan(0);

        shell.shouldPersistSession = () => true;
        shell.tabManager.getAllTabs.mockReturnValue([]);
        shell.tabManager.getActiveTab.mockReturnValue(null);
        shell.persistSession();
        expect(helpers.saveToLocalStorage).toHaveBeenCalledWith(STORAGE_KEYS.SESSION, {
            activeTabId: null,
            tabs: [],
        });

        helpers.loadFromLocalStorage.mockReturnValue({ tabs: 'bad' });
        shell.restoreSession();
        expect(shell.tabManager.createTab).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    test('command callbacks and tab event handlers cover inactive branches', async () => {
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        const component = {
            updateConnectionState: jest.fn(),
            updatePortName: jest.fn(),
            updateStatusBar: jest.fn(),
            updateRates: jest.fn(),
            setActive: jest.fn(),
            terminal: {
                appendData: jest.fn(),
                appendError: jest.fn(),
            },
            destroy: jest.fn(),
        };
        const inactiveTerminal = {
            appendError: jest.fn(),
        };

        shell.tabComponents.set('tab-1', component);
        shell.tabManager.getTabConfig.mockReturnValue({
            baudRate: 115200,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
        });
        shell.onTabConnected({ tabId: 'tab-1' });
        shell.onTabDisconnected({ tabId: 'tab-1' });
        shell.onTabSwitched({ tabId: 'tab-1' });
        shell.onTabData({ tabId: 'tab-1', data: 'RX' });
        shell.onTabError({ tabId: 'tab-1', error: new Error('boom') });
        shell.onTabRatesUpdated({ tabId: 'tab-1', rxRate: 1, txRate: 2 });
        shell.onTabClosed({ tabId: 'tab-1' });

        expect(component.updateConnectionState).toHaveBeenCalledWith(true);
        expect(component.updatePortName).toHaveBeenCalled();
        expect(component.terminal.appendData).toHaveBeenCalledWith('RX', 'rx');
        expect(component.terminal.appendError).toHaveBeenCalledWith('boom');
        expect(component.updateRates).toHaveBeenCalledWith(1, 2);
        expect(component.destroy).toHaveBeenCalled();

        shell.tabManager.getTab.mockReturnValue({
            service: { write: jest.fn(() => Promise.resolve()) },
            terminal: {
                appendTransmitted: jest.fn(),
                appendError: jest.fn(),
            },
        });
        await shell.sendData('tab-1', 'AT');
        expect(shell.tabManager.onDataSent).toHaveBeenCalledWith('tab-1', 'AT');

        shell.tabManager.getTab.mockReturnValue({
            service: { write: jest.fn(() => Promise.reject(new Error('send failed'))) },
            terminal: inactiveTerminal,
        });
        await shell.sendData('tab-1', 'AT');
        expect(inactiveTerminal.appendError).toHaveBeenCalledWith('send failed');

        shell.tabManager.getActiveTab.mockReturnValue(null);
        shell.registerCommandPaletteCommands();
        shell.commandPaletteCommands.find((command) => command.id === 'clear-active-terminal').run();
        shell.commandPaletteCommands.find((command) => command.id === 'close-active-tab').run();
        expect(shell.tabManager.clearTerminal).not.toHaveBeenCalled();
        expect(shell.tabManager.closeTab).not.toHaveBeenCalled();
    });

    test('workflow definitions, runner lifecycle, and command palette workspace actions are wired through', async () => {
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        const component = {
            updateWorkflowRuntime: jest.fn(),
            renderWorkflows: jest.fn(),
            renderWorkflowRuntime: jest.fn(),
            toggleTransactionPanel: jest.fn(),
            toggleWorkflowPanel: jest.fn(),
            terminal: {
                appendData: jest.fn(() => [{ id: 'entry-1', text: 'Echo: AT', type: 'rx' }]),
                appendTransmitted: jest.fn(() => ({ id: 'entry-2', text: '> AT', type: 'tx' })),
                appendError: jest.fn(() => ({ id: 'entry-3', text: 'Error: boom', type: 'error' })),
            },
            updateStatusBar: jest.fn(),
        };
        const tab = {
            id: 'tab-1',
            connected: true,
            service: { write: jest.fn(() => Promise.resolve()) },
            terminal: component.terminal,
            workflows: [{
                id: 'workflow-1',
                name: 'Handshake',
                steps: [
                    { id: 'step-1', type: 'send', payload: 'AT' },
                    { id: 'step-2', type: 'waitForMatch', pattern: 'Echo: AT', matchType: 'contains', scope: 'rx', timeoutMs: 2000 },
                ],
            }],
        };

        shell.tabComponents.set('tab-1', component);
        shell.tabManager.getTab.mockReturnValue(tab);
        shell.tabManager.getActiveTab.mockReturnValue({ id: 'tab-1' });
        shell.tabManager.updateWorkflows.mockImplementation((_tabId, workflows) => workflows.map((workflow) => ({
            id: workflow.id || 'workflow-2',
            ...workflow,
        })));

        shell.onTabWorkflowDefinitionsChange('tab-1', [{ name: 'Boot', steps: [{ type: 'send', payload: 'AT' }] }]);
        expect(shell.tabManager.updateWorkflows).toHaveBeenCalledWith('tab-1', expect.any(Array));
        expect(component.renderWorkflows).toHaveBeenCalled();

        shell.registerCommandPaletteCommands();
        shell.commandPaletteCommands.find((command) => command.id === 'toggle-transactions').run();
        expect(component.toggleTransactionPanel).toHaveBeenCalledWith(true);
        shell.commandPaletteCommands.find((command) => command.id === 'toggle-workflows').run();
        expect(component.toggleWorkflowPanel).toHaveBeenCalledWith(true);

        shell.startWorkflow('tab-1', 'workflow-1');
        await Promise.resolve();
        shell.onTabData({ tabId: 'tab-1', data: 'Echo: AT\n' });
        expect(component.updateWorkflowRuntime).toHaveBeenCalled();

        shell.stopWorkflow('tab-1');
        expect(shell.workflowRunners.has('tab-1')).toBe(false);

        tab.connected = false;
        shell.startWorkflow('tab-1', 'workflow-1');
        expect(shell.tabManager.updateWorkflowRuntime).toHaveBeenCalledWith('tab-1', expect.objectContaining({
            status: 'failed',
            error: 'Port is not connected',
        }));
    });

    test('global search finds entries across tabs and jumps to the selected result', () => {
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        const component = {
            focusSearchResult: jest.fn(),
        };

        shell.globalSearch = { style: { display: 'none' } };
        shell.globalSearchInput = {
            value: '',
            focus: jest.fn(),
            select: jest.fn(),
        };
        shell.globalSearchList = new FakeElement();
        shell.switchTab = jest.fn();
        shell.tabManager.getAllTabs.mockReturnValue([
            {
                id: 'tab-1',
                name: 'Main',
                terminal: {
                    entries: [
                        { id: 'entry-1', text: 'Echo: AT', type: 'rx', timestamp: new Date() },
                    ],
                },
            },
            {
                id: 'tab-2',
                name: 'Diag',
                terminal: {
                    entries: [
                        { id: 'entry-2', text: '> ATI', type: 'tx', timestamp: new Date() },
                    ],
                },
            },
        ]);
        shell.tabComponents.set('tab-2', component);

        shell.openGlobalSearch();
        expect(shell.globalSearch.style.display).toBe('flex');

        shell.globalSearchInput.value = 'ATI';
        shell.filterGlobalSearchResults('ATI');
        expect(shell.globalSearchResults).toHaveLength(1);
        expect(shell.globalSearchResults[0]).toEqual(expect.objectContaining({
            tabId: 'tab-2',
            entryId: 'entry-2',
        }));

        shell.executeSelectedGlobalSearchResult();
        expect(shell.switchTab).toHaveBeenCalledWith('tab-2');
        expect(component.focusSearchResult).toHaveBeenCalledWith('ATI', 'all', 'entry-2');
        expect(shell.globalSearch.style.display).toBe('none');
    });

    test('theme menu supports explicit system selection and about dialog renders current summary', async () => {
        const { AppShell } = require('../shared/js/app/AppShell.js');
        const shell = new AppShell();
        const themeIcon = new FakeElement();
        const themeLabel = new FakeElement();
        const systemItem = new FakeElement();
        const darkItem = new FakeElement();
        const lightItem = new FakeElement();
        const defaultPreset = new FakeElement();
        const claudePreset = new FakeElement();

        systemItem.dataset.themeValue = 'system';
        darkItem.dataset.themeValue = 'dark';
        lightItem.dataset.themeValue = 'light';
        defaultPreset.dataset.themeVariant = 'default';
        claudePreset.dataset.themeVariant = 'claude';

        shell.themeToggleButton = {
            querySelector(selector) {
                if (selector === '.theme-icon') return themeIcon;
                if (selector === '.theme-label') return themeLabel;
                return null;
            },
            setAttribute: jest.fn(),
        };
        shell.themeMenu = new FakeElement();
        shell.themeMenu.querySelectorAll = (selector) => {
            if (selector === '.theme-preset') {
                return [defaultPreset, claudePreset];
            }
            return [systemItem, darkItem, lightItem];
        };
        shell.persistSession = jest.fn();

        shell.attachThemeMenuEventListeners();
        shell.showThemeMenu();
        expect(shell.themeMenu.style.display).toBe('block');

        darkItem.listeners.get('click')();
        expect(shell.theme).toBe('dark');
        expect(themeIcon.textContent).toBe('🌙');
        expect(themeLabel.textContent).toBe('Dark · Blue');

        systemItem.listeners.get('click')();
        expect(shell.theme).toBe('system');
        expect(themeIcon.textContent).toBe('🖥️');
        expect(themeLabel.textContent).toBe('System · Blue');

        claudePreset.listeners.get('click')();
        expect(shell.themeVariant).toBe('claude');
        expect(themeIcon.textContent).toBe('✦');
        expect(themeLabel.textContent).toBe('System · Claude');

        shell.tabManager.getAllTabs.mockReturnValue([{ id: 'tab-1' }, { id: 'tab-2' }]);
        shell.getAboutBuildInfo = jest.fn(() => Promise.resolve({
            version: '0.6.0',
            commitId: '09b4000',
        }));
        await shell.showAbout();
        expect(document.body.children.length).toBeGreaterThan(0);
        expect(document.body.children.at(-1).innerHTML).toContain('Cross-tab global search');
        expect(document.body.children.at(-1).innerHTML).toContain('Tabs');
        expect(document.body.children.at(-1).innerHTML).toContain('Version');
        expect(document.body.children.at(-1).innerHTML).toContain('0.6.0');
        expect(document.body.children.at(-1).innerHTML).toContain('Commit');
        expect(document.body.children.at(-1).innerHTML).toContain('09b4000');
        expect(shell.getAboutThemeLabel()).toBe('System · Claude Canvas');
    });
});
