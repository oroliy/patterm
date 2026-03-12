import { TabManager } from '../../../web/js/services/TabManager.js';
import { TabComponent } from '../../../web/js/components/TabComponent.js';
import { globalEvents } from '../../../web/js/services/EventManager.js';
import { STORAGE_KEYS, THEME_OPTIONS } from '../../../web/js/utils/constants.js';
import { applyTheme, saveToLocalStorage, loadFromLocalStorage } from '../../../web/js/utils/helpers.js';
import { filterTerminalEntries } from '../terminal/terminalEntries.js';
import { WorkflowRunner } from '../workflows/workflows.js';

export class AppShell {
    constructor() {
        this.tabManager = new TabManager();
        this.tabComponents = new Map();
        this.theme = loadFromLocalStorage(STORAGE_KEYS.THEME, 'system');
        this.contextMenu = null;
        this.themeMenu = null;
        this.themeToggleButton = null;
        this.commandPalette = null;
        this.commandPaletteInput = null;
        this.commandPaletteList = null;
        this.commandPaletteCommands = [];
        this.filteredCommands = [];
        this.selectedCommandIndex = 0;
        this.globalSearch = null;
        this.globalSearchInput = null;
        this.globalSearchList = null;
        this.globalSearchResults = [];
        this.globalSearchType = 'all';
        this.selectedGlobalSearchIndex = 0;
        this.workflowRunners = new Map();
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
        this.themeToggleButton = document.getElementById('theme-toggle-btn');
        this.themeToggleButton?.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleThemeMenu();
        });
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

        document.addEventListener('click', () => {
            this.hideContextMenu();
            this.hideThemeMenu();
        });
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
            onFiltersChange: (tabId, filterState) => this.onTabFiltersChange(tabId, filterState),
            onTriggerRulesChange: (tabId, triggerRules) => this.onTabTriggerRulesChange(tabId, triggerRules),
            onWorkflowDefinitionsChange: (tabId, workflows) => this.onTabWorkflowDefinitionsChange(tabId, workflows),
            onWorkflowRun: (tabId, workflowId) => this.startWorkflow(tabId, workflowId),
            onWorkflowStop: (tabId) => this.stopWorkflow(tabId)
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
        this.stopWorkflow(tabId, 'Port disconnected');
        const component = this.tabComponents.get(tabId);
        if (component) {
            component.updateConnectionState(false);
        }
    }

    onTabClosed({ tabId }) {
        this.stopWorkflow(tabId, 'Tab closed');
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
            const entries = component.terminal.appendData(data, 'rx');
            component.updateStatusBar();
            this.handleWorkflowEntries(tabId, entries);
        }
    }

    onTabError({ tabId, error }) {
        const component = this.tabComponents.get(tabId);
        if (component) {
            const entry = component.terminal.appendError(error.message || String(error));
            this.handleWorkflowEntries(tabId, entry ? [entry] : []);
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

    onTabTriggerRulesChange(tabId, triggerRules) {
        this.tabManager.updateTriggerRules(tabId, triggerRules);
        this.persistSession();
    }

    onTabWorkflowDefinitionsChange(tabId, workflows) {
        const normalizedWorkflows = this.tabManager.updateWorkflows(tabId, workflows);
        const component = this.tabComponents.get(tabId);
        if (component) {
            if (component.tabState) {
                component.tabState.workflows = normalizedWorkflows;
            }
            component.renderWorkflows?.();
            component.renderWorkflowRuntime?.();
        }
        this.persistSession();
    }

    async sendData(tabId, data) {
        const tab = this.tabManager.getTab(tabId);
        if (!tab || !tab.service) {
            return;
        }

        try {
            await tab.service.write(data);
            const entry = tab.terminal.appendTransmitted(data);
            this.tabManager.onDataSent(tabId, data);

            const component = this.tabComponents.get(tabId);
            if (component) {
                component.updateStatusBar();
            }
            this.handleWorkflowEntries(tabId, entry ? [entry] : []);
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
        this.setTheme(THEME_OPTIONS[nextIndex].value);
    }

    onThemeChanged() {
    }

    setTheme(theme) {
        this.theme = theme;
        saveToLocalStorage(STORAGE_KEYS.THEME, this.theme);
        applyTheme(this.theme);
        this.updateThemeButton();
        this.onThemeChanged(this.theme);
        this.persistSession();
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
        this.themeMenu = document.getElementById('theme-menu');
        this.commandPalette = document.getElementById('command-palette');
        this.commandPaletteInput = document.getElementById('command-palette-input');
        this.commandPaletteList = document.getElementById('command-palette-list');
        this.globalSearch = document.getElementById('global-search');
        this.globalSearchInput = document.getElementById('global-search-input');
        this.globalSearchList = document.getElementById('global-search-list');

        this.attachThemeMenuEventListeners();
        this.registerCommandPaletteCommands();
        this.attachCommandPaletteEventListeners();
        this.attachGlobalSearchEventListeners();
        this.updateThemeButton();
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

    attachThemeMenuEventListeners() {
        if (!this.themeMenu) {
            return;
        }

        this.themeMenu.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        const items = this.themeMenu.querySelectorAll('.theme-menu-item');
        items.forEach((item) => {
            item.addEventListener('click', () => {
                const value = item.dataset.themeValue;
                if (!value) {
                    return;
                }

                this.setTheme(value);
                this.hideThemeMenu();
            });
        });
    }

    toggleThemeMenu() {
        if (!this.themeMenu) {
            this.toggleTheme();
            return;
        }

        if (this.themeMenu.style.display === 'block') {
            this.hideThemeMenu();
            return;
        }

        this.showThemeMenu();
    }

    showThemeMenu() {
        if (!this.themeMenu) {
            return;
        }

        this.themeMenu.style.display = 'block';
        this.updateThemeButton();
    }

    hideThemeMenu() {
        if (this.themeMenu) {
            this.themeMenu.style.display = 'none';
        }
    }

    updateThemeButton() {
        const currentOption = THEME_OPTIONS.find((option) => option.value === this.theme) || THEME_OPTIONS[0];
        const icon = this.themeToggleButton?.querySelector('.theme-icon');
        const label = this.themeToggleButton?.querySelector('.theme-label');

        if (icon) {
            icon.textContent = currentOption.value === 'dark'
                ? '🌙'
                : currentOption.value === 'light'
                    ? '☀️'
                    : '🖥️';
        }

        if (label) {
            label.textContent = currentOption.label;
        }

        if (this.themeToggleButton) {
            this.themeToggleButton.title = `Theme: ${currentOption.label}`;
            this.themeToggleButton.setAttribute('aria-label', `Theme: ${currentOption.label}`);
        }

        if (!this.themeMenu) {
            return;
        }

        const items = this.themeMenu.querySelectorAll('.theme-menu-item');
        items.forEach((item) => {
            item.classList.toggle('active', item.dataset.themeValue === this.theme);
        });
    }

    handleGlobalKeydown(event) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            this.toggleCommandPalette();
            return;
        }

        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            this.openGlobalSearch();
            return;
        }

        if (event.key === 'Escape' && this.themeMenu?.style.display === 'block') {
            event.preventDefault();
            this.hideThemeMenu();
            return;
        }

        if (this.isGlobalSearchOpen()) {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.closeGlobalSearch();
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                this.moveGlobalSearchSelection(1);
                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                this.moveGlobalSearchSelection(-1);
                return;
            }

            if (event.key === 'Enter') {
                event.preventDefault();
                this.executeSelectedGlobalSearchResult();
                return;
            }
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
                id: 'search-all-tabs',
                label: 'Search All Tabs',
                keywords: ['search', 'find', 'global', 'tabs'],
                run: () => this.openGlobalSearch()
            },
            {
                id: 'toggle-workflows',
                label: 'Open Workflows',
                keywords: ['workflow', 'macro', 'automation', 'steps'],
                run: () => {
                    const activeTab = this.tabManager.getActiveTab();
                    const component = activeTab ? this.tabComponents.get(activeTab.id) : null;
                    component?.toggleWorkflowPanel(true);
                }
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

    attachGlobalSearchEventListeners() {
        if (!this.globalSearch || !this.globalSearchInput || !this.globalSearchList) {
            return;
        }

        this.globalSearch.addEventListener('click', (event) => {
            if (event.target === this.globalSearch) {
                this.closeGlobalSearch();
            }
        });

        this.globalSearchInput.addEventListener('input', (event) => {
            this.filterGlobalSearchResults(event.target.value);
        });

        const filterButtons = this.globalSearch.querySelectorAll('.global-search-filter-btn');
        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filterType = button.dataset.filterType || 'all';
                filterButtons.forEach((item) => item.classList.toggle('active', item === button));
                this.globalSearchType = filterType;
                this.filterGlobalSearchResults(this.globalSearchInput.value);
            });
        });
    }

    openGlobalSearch() {
        if (!this.globalSearch || !this.globalSearchInput) {
            return;
        }

        this.globalSearch.style.display = 'flex';
        this.filterGlobalSearchResults(this.globalSearchInput.value || '');
        this.globalSearchInput.focus();
        this.globalSearchInput.select?.();
    }

    closeGlobalSearch() {
        if (!this.globalSearch || !this.globalSearchInput) {
            return;
        }

        this.globalSearch.style.display = 'none';
        this.globalSearchInput.value = '';
        this.globalSearchResults = [];
        this.selectedGlobalSearchIndex = 0;
        this.renderGlobalSearchResults();
    }

    isGlobalSearchOpen() {
        return Boolean(this.globalSearch) && this.globalSearch.style.display === 'flex';
    }

    filterGlobalSearchResults(query = '') {
        const normalizedQuery = query.trim();
        this.globalSearchResults = this.getGlobalSearchResults(normalizedQuery, this.globalSearchType);
        this.selectedGlobalSearchIndex = 0;
        this.renderGlobalSearchResults();
    }

    getGlobalSearchResults(query = '', type = 'all') {
        const tabs = this.tabManager.getAllTabs();

        return tabs.flatMap((tab) => {
            const terminal = tab.terminal || this.tabComponents.get(tab.id)?.terminal;
            if (!terminal?.entries) {
                return [];
            }

            const entries = filterTerminalEntries(terminal.entries, { search: query, type });
            return entries.map((entry) => ({
                tabId: tab.id,
                tabName: tab.name,
                entryId: entry.id,
                text: entry.text,
                type: entry.type,
                timestamp: entry.timestamp,
            }));
        });
    }

    renderGlobalSearchResults() {
        if (!this.globalSearchList) {
            return;
        }

        this.globalSearchList.innerHTML = '';

        this.globalSearchResults.forEach((result, index) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'global-search-item';
            item.classList.toggle('active', index === this.selectedGlobalSearchIndex);
            item.innerHTML = `
                <span class="global-search-item-tab">${result.tabName}</span>
                <span class="global-search-item-type">${String(result.type).toUpperCase()}</span>
                <span class="global-search-item-text">${result.text || '(empty line)'}</span>
            `;
            item.addEventListener('click', () => this.executeGlobalSearchResult(result));
            this.globalSearchList.appendChild(item);
        });

        if (this.globalSearchResults.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'global-search-empty';
            emptyState.textContent = 'No matching terminal entries';
            this.globalSearchList.appendChild(emptyState);
        }
    }

    moveGlobalSearchSelection(direction) {
        if (this.globalSearchResults.length === 0) {
            return;
        }

        const lastIndex = this.globalSearchResults.length - 1;
        this.selectedGlobalSearchIndex = Math.min(
            lastIndex,
            Math.max(0, this.selectedGlobalSearchIndex + direction)
        );
        this.renderGlobalSearchResults();
    }

    executeSelectedGlobalSearchResult() {
        const result = this.globalSearchResults[this.selectedGlobalSearchIndex];
        if (result) {
            this.executeGlobalSearchResult(result);
        }
    }

    executeGlobalSearchResult(result) {
        this.switchTab(result.tabId);
        const component = this.tabComponents.get(result.tabId);
        component?.focusSearchResult(this.globalSearchInput?.value || '', this.globalSearchType, result.entryId);
        this.closeGlobalSearch();
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
                filterState: tab.filterState,
                triggerRules: tab.triggerRules,
                workflows: tab.workflows
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
            },
            triggerRules: Array.isArray(tab.triggerRules)
                ? tab.triggerRules.map((rule) => ({ ...rule }))
                : [],
            workflows: Array.isArray(tab.workflows)
                ? tab.workflows.map((workflow) => ({
                    ...workflow,
                    steps: workflow.steps.map((step) => ({ ...step }))
                }))
                : []
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
        const overlay = document.createElement('div');
        overlay.className = 'about-overlay';
        overlay.innerHTML = `
            <div class="about-dialog">
                <h2>Patterm</h2>
                <p class="about-summary">${this.getAboutSummary()}</p>
                <div class="about-meta">
                    <div class="about-meta-item">
                        <span class="about-meta-label">Surface</span>
                        <span class="about-meta-value">${this.getAboutSurfaceLabel()}</span>
                    </div>
                    <div class="about-meta-item">
                        <span class="about-meta-label">Theme</span>
                        <span class="about-meta-value">${this.getAboutThemeLabel()}</span>
                    </div>
                    <div class="about-meta-item">
                        <span class="about-meta-label">Tabs</span>
                        <span class="about-meta-value">${this.tabManager.getAllTabs().length}</span>
                    </div>
                </div>
                <div class="about-highlights">
                    <span class="about-chip">Multi-tab serial sessions</span>
                    <span class="about-chip">Per-tab search and filters</span>
                    <span class="about-chip">Cross-tab global search</span>
                    <span class="about-chip">Command palette</span>
                    <span class="about-chip">Session restore</span>
                    <span class="about-chip">Read-only trigger highlights</span>
                    <span class="about-chip">Workflow runner MVP</span>
                </div>
                <div class="about-actions">
                    <a href="https://github.com/oroliy/patterm" target="_blank" rel="noreferrer">Project Home</a>
                    <button class="btn btn-primary" type="button" onclick="this.closest('.about-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    getAboutSummary() {
        return 'A modern serial terminal focused on multi-session debugging across desktop and web.';
    }

    getAboutSurfaceLabel() {
        return 'Shared UI';
    }

    getAboutThemeLabel() {
        return THEME_OPTIONS.find((option) => option.value === this.theme)?.label || 'System';
    }

    async showConnectionDialog() {
        throw new Error('showConnectionDialog() must be implemented by subclasses');
    }

    handleWorkflowEntries(tabId, entries = []) {
        if (!Array.isArray(entries) || entries.length === 0) {
            return;
        }

        const runner = this.workflowRunners.get(tabId);
        if (!runner) {
            return;
        }

        entries.forEach((entry) => {
            runner.handleEntry(entry);
        });
    }

    startWorkflow(tabId, workflowId) {
        const tab = this.tabManager.getTab(tabId);
        if (!tab) {
            return null;
        }

        const workflow = (tab.workflows || []).find((item) => item.id === workflowId);
        if (!workflow) {
            return null;
        }

        if (!tab.connected || !tab.service) {
            const runtime = this.tabManager.updateWorkflowRuntime(tabId, {
                workflowId,
                status: 'failed',
                currentStepIndex: -1,
                completedStepIds: [],
                error: 'Port is not connected'
            });
            this.tabComponents.get(tabId)?.updateWorkflowRuntime(runtime);
            return runtime;
        }

        this.stopWorkflow(tabId, 'Replaced by a new workflow run');

        const runner = new WorkflowRunner(workflow, {
            send: async (payload) => this.sendData(tabId, payload),
            onStateChange: (runtime) => {
                const nextRuntime = this.tabManager.updateWorkflowRuntime(tabId, runtime);
                this.tabComponents.get(tabId)?.updateWorkflowRuntime(nextRuntime);
                if (runtime.status && runtime.status !== 'running') {
                    this.workflowRunners.delete(tabId);
                }
            }
        });

        this.workflowRunners.set(tabId, runner);
        runner.start();

        return runner.getState();
    }

    stopWorkflow(tabId, reason = 'Stopped') {
        const runner = this.workflowRunners.get(tabId);
        if (!runner) {
            return null;
        }

        const runtime = runner.stop(reason);
        this.workflowRunners.delete(tabId);
        const nextRuntime = this.tabManager.updateWorkflowRuntime(tabId, runtime);
        this.tabComponents.get(tabId)?.updateWorkflowRuntime(nextRuntime);
        return nextRuntime;
    }
}
