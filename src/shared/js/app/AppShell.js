import { TabManager } from '../../../web/js/services/TabManager.js';
import { TabComponent } from '../../../web/js/components/TabComponent.js';
import { globalEvents } from '../../../web/js/services/EventManager.js';
import { STORAGE_KEYS, THEME_OPTIONS } from '../../../web/js/utils/constants.js';
import { applyTheme, saveToLocalStorage, loadFromLocalStorage } from '../../../web/js/utils/helpers.js';

export class AppShell {
    constructor() {
        this.tabManager = new TabManager();
        this.tabComponents = new Map();
        this.theme = loadFromLocalStorage(STORAGE_KEYS.THEME, 'system');
        this.contextMenu = null;
        this.commandPalette = null;
        this.commandPaletteInput = null;
        this.commandPaletteList = null;
        this.commandPaletteCommands = [];
        this.filteredCommands = [];
        this.selectedCommandIndex = 0;
    }

    async init() {
        this.beforeRegisterEventHandlers();
        this.initTheme();
        this.registerEventHandlers();
        this.initContextMenu();
        this.restoreSession();
        this.afterInit();
        this.updateEmptyState();
    }

    beforeRegisterEventHandlers() {
    }

    afterInit() {
    }

    initTheme() {
        applyTheme(this.theme);
    }

    registerEventHandlers() {
        document.getElementById('new-tab-btn')?.addEventListener('click', () => this.showConnectionDialog());
        document.getElementById('empty-new-connection-btn')?.addEventListener('click', () => this.showConnectionDialog());
        document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('command-palette-btn')?.addEventListener('click', () => this.toggleCommandPalette());

        const aboutButton = document.getElementById('about-btn');
        if (aboutButton) {
            aboutButton.addEventListener('click', () => this.showAbout());
        }

        globalEvents.on('tab:created', (data) => this.onTabCreated(data));
        globalEvents.on('tab:connected', (data) => this.onTabConnected(data));
        globalEvents.on('tab:disconnected', (data) => this.onTabDisconnected(data));
        globalEvents.on('tab:closed', (data) => this.onTabClosed(data));
        globalEvents.on('tab:switched', (data) => this.onTabSwitched(data));
        globalEvents.on('tab:data', (data) => this.onTabData(data));
        globalEvents.on('tab:error', (data) => this.onTabError(data));
        globalEvents.on('tab:ratesUpdated', (data) => this.onTabRatesUpdated(data));
        globalEvents.on('tab:closed', () => this.persistSession());
        globalEvents.on('tab:switched', () => this.persistSession());
        globalEvents.on('tab:connected', () => this.persistSession());
        globalEvents.on('tab:disconnected', () => this.persistSession());

        document.addEventListener('click', () => this.hideContextMenu());
        document.addEventListener('keydown', (event) => this.handleGlobalKeydown(event));
        this.registerPlatformEventHandlers();
    }

    registerPlatformEventHandlers() {
    }

    onTabCreated(tabState) {
        const component = new TabComponent(tabState, {
            onClose: (tabId) => this.closeTab(tabId),
            onSwitch: (tabId) => this.switchTab(tabId),
            onSend: (tabId, data) => this.sendData(tabId, data),
            onClear: (tabId) => this.clearTerminal(tabId),
            onContextMenu: (tabId, event) => this.showTabContextMenu(tabId, event),
            onFiltersChange: (tabId, filterState) => this.onTabFiltersChange(tabId, filterState)
        });

        component.create();
        this.tabComponents.set(tabState.id, component);

        document.getElementById('tabs-container').appendChild(component.tabElement);
        document.getElementById('tabs-content').appendChild(component.element);

        this.switchTab(tabState.id);
        this.updateEmptyState();
        this.persistSession();
    }

    onTabConnected(data) {
        const tabId = data?.tabId;
        const component = this.tabComponents.get(tabId);
        if (component) {
            component.updateConnectionState(true);
            const config = this.tabManager.getTabConfig(tabId);
            component.updatePortName(config);
        }
    }

    onTabDisconnected({ tabId }) {
        const component = this.tabComponents.get(tabId);
        if (component) {
            component.updateConnectionState(false);
        }
    }

    onTabClosed({ tabId }) {
        const component = this.tabComponents.get(tabId);
        if (component) {
            component.destroy();
            this.tabComponents.delete(tabId);
        }
        this.updateEmptyState();
    }

    onTabSwitched({ tabId }) {
        this.tabComponents.forEach((component, id) => {
            component.setActive(id === tabId);
        });
    }

    onTabData({ tabId, data }) {
        const component = this.tabComponents.get(tabId);
        if (component) {
            component.terminal.appendData(data, 'rx');
            component.updateStatusBar();
        }
    }

    onTabError({ tabId, error }) {
        const component = this.tabComponents.get(tabId);
        if (component) {
            component.terminal.appendError(error.message || String(error));
        }
    }

    onTabRatesUpdated({ tabId, rxRate, txRate }) {
        const component = this.tabComponents.get(tabId);
        if (component) {
            component.updateRates(rxRate, txRate);
        }
    }

    onTabFiltersChange(tabId, filterState) {
        this.tabManager.updateFilterState(tabId, filterState);
        this.persistSession();
    }

    async sendData(tabId, data) {
        const tab = this.tabManager.getTab(tabId);
        if (!tab || !tab.service) {
            return;
        }

        try {
            await tab.service.write(data);
            tab.terminal.appendTransmitted(data);
            this.tabManager.onDataSent(tabId, data);

            const component = this.tabComponents.get(tabId);
            if (component) {
                component.updateStatusBar();
            }
        } catch (error) {
            tab.terminal.appendError(error.message);
        }
    }

    closeTab(tabId) {
        this.tabManager.closeTab(tabId);
    }

    switchTab(tabId) {
        this.tabManager.switchTab(tabId);
    }

    clearTerminal(tabId) {
        this.tabManager.clearTerminal(tabId);
    }

    toggleTheme() {
        const currentIndex = THEME_OPTIONS.findIndex((option) => option.value === this.theme);
        const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
        this.theme = THEME_OPTIONS[nextIndex].value;
        saveToLocalStorage(STORAGE_KEYS.THEME, this.theme);
        applyTheme(this.theme);
        this.onThemeChanged(this.theme);
        this.persistSession();
    }

    onThemeChanged() {
    }

    updateEmptyState() {
        const emptyState = document.getElementById('empty-state');
        const tabsContent = document.getElementById('tabs-content');

        if (this.tabComponents.size === 0) {
            emptyState.style.display = 'flex';
            tabsContent.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            tabsContent.style.display = 'block';
        }
    }

    initContextMenu() {
        this.contextMenu = document.getElementById('context-menu');
        this.commandPalette = document.getElementById('command-palette');
        this.commandPaletteInput = document.getElementById('command-palette-input');
        this.commandPaletteList = document.getElementById('command-palette-list');

        this.registerCommandPaletteCommands();
        this.attachCommandPaletteEventListeners();
    }

    showTabContextMenu(tabId, event) {
        this.showContextMenu(event, this.getTabContextMenuItems(tabId));
    }

    getTabContextMenuItems(tabId) {
        return [
            { label: 'Clear Screen', action: () => this.clearTerminal(tabId) },
            { label: 'Copy All Text', action: () => this.copyTabContent(tabId) }
        ];
    }

    showContextMenu(event, items) {
        if (!this.contextMenu) {
            return;
        }

        const menuItems = this.contextMenu.querySelector('.context-menu-items');
        menuItems.innerHTML = '';

        items.forEach((item) => {
            const menuItem = document.createElement('div');
            menuItem.className = 'context-menu-item';
            menuItem.textContent = item.label;
            menuItem.addEventListener('click', () => {
                item.action();
                this.hideContextMenu();
            });
            menuItems.appendChild(menuItem);
        });

        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${event.pageX}px`;
        this.contextMenu.style.top = `${event.pageY}px`;
    }

    hideContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
    }

    handleGlobalKeydown(event) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            this.toggleCommandPalette();
            return;
        }

        if (!this.isCommandPaletteOpen()) {
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            this.closeCommandPalette();
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.moveCommandSelection(1);
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.moveCommandSelection(-1);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            this.executeSelectedCommand();
        }
    }

    attachCommandPaletteEventListeners() {
        if (!this.commandPalette || !this.commandPaletteInput || !this.commandPaletteList) {
            return;
        }

        this.commandPalette.addEventListener('click', (event) => {
            if (event.target === this.commandPalette) {
                this.closeCommandPalette();
            }
        });

        this.commandPaletteInput.addEventListener('input', (event) => {
            this.filterCommands(event.target.value);
        });
    }

    registerCommandPaletteCommands() {
        this.commandPaletteCommands = [
            {
                id: 'new-connection',
                label: 'New Connection',
                keywords: ['connect', 'serial', 'open', 'port'],
                run: () => this.showConnectionDialog()
            },
            {
                id: 'toggle-theme',
                label: 'Toggle Theme',
                keywords: ['theme', 'dark', 'light', 'appearance'],
                run: () => this.toggleTheme()
            },
            {
                id: 'search-current-tab',
                label: 'Search Current Tab',
                keywords: ['search', 'find', 'filter', 'terminal'],
                run: () => this.focusActiveTabSearch()
            },
            {
                id: 'clear-active-terminal',
                label: 'Clear Active Terminal',
                keywords: ['clear', 'terminal', 'screen'],
                run: () => {
                    const activeTab = this.tabManager.getActiveTab();
                    if (activeTab) {
                        this.clearTerminal(activeTab.id);
                    }
                }
            },
            {
                id: 'close-active-tab',
                label: 'Close Active Tab',
                keywords: ['close', 'tab', 'disconnect'],
                run: () => {
                    const activeTab = this.tabManager.getActiveTab();
                    if (activeTab) {
                        this.closeTab(activeTab.id);
                    }
                }
            }
        ];

        this.filteredCommands = [...this.commandPaletteCommands];
    }

    toggleCommandPalette() {
        if (this.isCommandPaletteOpen()) {
            this.closeCommandPalette();
            return;
        }

        this.openCommandPalette();
    }

    openCommandPalette() {
        if (!this.commandPalette || !this.commandPaletteInput) {
            return;
        }

        this.filterCommands('');
        this.commandPalette.style.display = 'flex';
        this.commandPaletteInput.value = '';
        this.commandPaletteInput.focus();
    }

    closeCommandPalette() {
        if (!this.commandPalette || !this.commandPaletteInput) {
            return;
        }

        this.commandPalette.style.display = 'none';
        this.commandPaletteInput.value = '';
    }

    isCommandPaletteOpen() {
        return Boolean(this.commandPalette) && this.commandPalette.style.display === 'flex';
    }

    filterCommands(query = '') {
        const normalizedQuery = query.trim().toLowerCase();
        this.filteredCommands = this.commandPaletteCommands.filter((command) => {
            if (!normalizedQuery) {
                return true;
            }

            return command.label.toLowerCase().includes(normalizedQuery) ||
                command.keywords.some((keyword) => keyword.includes(normalizedQuery));
        });
        this.selectedCommandIndex = 0;
        this.renderCommandPaletteList();
    }

    renderCommandPaletteList() {
        if (!this.commandPaletteList) {
            return;
        }

        this.commandPaletteList.innerHTML = '';

        this.filteredCommands.forEach((command, index) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'command-palette-item';
            item.dataset.commandId = command.id;
            item.classList.toggle('active', index === this.selectedCommandIndex);
            item.innerHTML = `
                <span class="command-palette-item-label">${command.label}</span>
                <span class="command-palette-item-keywords">${command.keywords.join(' · ')}</span>
            `;
            item.addEventListener('click', () => this.executeCommand(command));
            this.commandPaletteList.appendChild(item);
        });

        if (this.filteredCommands.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'command-palette-empty';
            emptyState.textContent = 'No matching commands';
            this.commandPaletteList.appendChild(emptyState);
        }
    }

    moveCommandSelection(direction) {
        if (this.filteredCommands.length === 0) {
            return;
        }

        const lastIndex = this.filteredCommands.length - 1;
        this.selectedCommandIndex = Math.min(
            lastIndex,
            Math.max(0, this.selectedCommandIndex + direction)
        );
        this.renderCommandPaletteList();
    }

    executeSelectedCommand() {
        const command = this.filteredCommands[this.selectedCommandIndex];
        if (command) {
            this.executeCommand(command);
        }
    }

    executeCommand(command) {
        this.closeCommandPalette();
        command.run();
    }

    focusActiveTabSearch() {
        const activeTab = this.tabManager.getActiveTab();
        if (!activeTab) {
            return;
        }

        const component = this.tabComponents.get(activeTab.id);
        component?.focusSearch();
    }

    shouldPersistSession() {
        return false;
    }

    getSessionStorageKey() {
        return STORAGE_KEYS.SESSION;
    }

    persistSession() {
        if (!this.shouldPersistSession()) {
            return;
        }

        saveToLocalStorage(this.getSessionStorageKey(), this.serializeSession());
    }

    restoreSession() {
        if (!this.shouldPersistSession()) {
            return;
        }

        const session = loadFromLocalStorage(this.getSessionStorageKey(), null);
        if (!session || !Array.isArray(session.tabs)) {
            return;
        }

        session.tabs.forEach((tab) => {
            this.tabManager.createTab(tab.config, tab.name, {
                id: tab.id,
                createdTime: tab.createdTime,
                autoScroll: tab.autoScroll,
                filterState: tab.filterState
            });
        });

        if (session.activeTabId && this.tabComponents.has(session.activeTabId)) {
            this.switchTab(session.activeTabId);
        }
    }

    serializeSession() {
        const tabs = this.tabManager.getAllTabs().map((tab) => ({
            id: tab.id,
            name: tab.name,
            config: tab.config,
            connected: false,
            autoScroll: tab.autoScroll,
            createdTime: tab.createdTime instanceof Date ? tab.createdTime.toISOString() : tab.createdTime,
            filterState: {
                ...(tab.filterState || {})
            }
        }));

        return {
            activeTabId: this.tabManager.getActiveTab()?.id || null,
            tabs
        };
    }

    async copyTabContent(tabId) {
        const component = this.tabComponents.get(tabId);
        if (!component) {
            return;
        }

        try {
            await component.terminal.copyAll();
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }

    showError(message) {
        const overlay = document.createElement('div');
        overlay.className = 'error-overlay';
        overlay.innerHTML = `
            <div class="error-dialog">
                ${message}
                <button class="btn btn-primary" onclick="this.closest('.error-overlay').remove()">Close</button>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    showAbout() {
    }

    async showConnectionDialog() {
        throw new Error('showConnectionDialog() must be implemented by subclasses');
    }
}
