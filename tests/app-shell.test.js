jest.mock('../src/web/js/services/TabManager.js', () => {
    const createManager = () => ({
        getActiveTab: jest.fn(() => ({ id: 'tab-1' })),
        getAllTabs: jest.fn(() => []),
        createTab: jest.fn(),
        switchTab: jest.fn(),
        closeTab: jest.fn(),
        clearTerminal: jest.fn(),
        updateFilterState: jest.fn(),
        getTab: jest.fn(() => null),
        getTabConfig: jest.fn(() => null),
    });

    return {
        TabManager: jest.fn(() => createManager()),
    };
});

jest.mock('../src/web/js/components/TabComponent.js', () => ({
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
    })),
}));

jest.mock('../src/web/js/services/EventManager.js', () => ({
    globalEvents: {
        on: jest.fn(),
    },
}));

jest.mock('../src/web/js/utils/helpers.js', () => ({
    applyTheme: jest.fn(),
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
        'command-palette',
        'command-palette-input',
        'command-palette-list',
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
        const { applyTheme, saveToLocalStorage } = require('../src/web/js/utils/helpers.js');
        const { STORAGE_KEYS } = require('../src/web/js/utils/constants.js');
        const { AppShell } = require('../src/shared/js/app/AppShell.js');
        const shell = new AppShell();
        shell.persistSession = jest.fn();

        shell.toggleTheme();

        expect(shell.theme).toBe('dark');
        expect(saveToLocalStorage).toHaveBeenCalledWith(STORAGE_KEYS.THEME, 'dark');
        expect(applyTheme).toHaveBeenCalledWith('dark');
        expect(shell.persistSession).toHaveBeenCalled();
    });

    test('filterCommands narrows palette results and resets selection', () => {
        const { AppShell } = require('../src/shared/js/app/AppShell.js');
        const shell = new AppShell();
        shell.commandPaletteList = new FakeElement();
        shell.registerCommandPaletteCommands();
        shell.selectedCommandIndex = 3;

        shell.filterCommands('theme');

        expect(shell.selectedCommandIndex).toBe(0);
        expect(shell.filteredCommands.map((command) => command.id)).toEqual(['toggle-theme']);
        expect(shell.commandPaletteList.children.length).toBe(1);
    });

    test('serializeSession and restoreSession round-trip tab metadata', () => {
        const helpers = require('../src/web/js/utils/helpers.js');
        const { AppShell } = require('../src/shared/js/app/AppShell.js');
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
            })
        );
        expect(shell.tabManager.switchTab).toHaveBeenCalledWith('tab-1');
    });

    test('updateEmptyState toggles empty view based on tab count', () => {
        const elements = installFakeDocument();
        const { AppShell } = require('../src/shared/js/app/AppShell.js');
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
        const { AppShell } = require('../src/shared/js/app/AppShell.js');
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
        const { TabComponent } = require('../src/web/js/components/TabComponent.js');
        const { AppShell } = require('../src/shared/js/app/AppShell.js');
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
        const { AppShell } = require('../src/shared/js/app/AppShell.js');
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
});
