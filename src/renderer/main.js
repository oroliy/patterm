import { TabManager } from '../web/js/services/TabManager.js';
import { globalEvents } from '../web/js/services/EventManager.js';
import { TabComponent } from '../web/js/components/TabComponent.js';
import { STORAGE_KEYS, THEME_OPTIONS } from '../web/js/utils/constants.js';
import { applyTheme, saveToLocalStorage, loadFromLocalStorage } from '../web/js/utils/helpers.js';
import { ElectronConnectionDialog } from './ElectronConnectionDialog.js';
import { IpcSerialProvider } from './services/IpcSerialProvider.js';

const { ipcRenderer } = window.require('electron');

class PattermElectronApp {
    constructor() {
        this.tabManager = new TabManager();
        this.tabComponents = new Map();
        this.theme = loadFromLocalStorage(STORAGE_KEYS.THEME, 'system');
        this.contextMenu = null;
    }

    async init() {
        this.initTheme();
        this.registerEventHandlers();
        this.initContextMenu();
        this.updateEmptyState();
        
        // Let main process know we are ready
        ipcRenderer.on('menu:new-connection', () => this.showConnectionDialog());
        ipcRenderer.on('theme:set', (event, theme) => {
            this.theme = theme;
            saveToLocalStorage(STORAGE_KEYS.THEME, this.theme);
            applyTheme(this.theme);
        });
    }

    initTheme() {
        applyTheme(this.theme);
    }

    registerEventHandlers() {
        document.getElementById('new-tab-btn')?.addEventListener('click', () => this.showConnectionDialog());
        document.getElementById('empty-new-connection-btn')?.addEventListener('click', () => this.showConnectionDialog());
        document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());

        globalEvents.on('tab:created', (data) => this.onTabCreated(data));
        globalEvents.on('tab:connected', (data) => this.onTabConnected(data));
        globalEvents.on('tab:disconnected', (data) => this.onTabDisconnected(data));
        globalEvents.on('tab:closed', (data) => this.onTabClosed(data));
        globalEvents.on('tab:switched', (data) => this.onTabSwitched(data));
        globalEvents.on('tab:data', (data) => this.onTabData(data));
        globalEvents.on('tab:error', (data) => this.onTabError(data));
        globalEvents.on('tab:ratesUpdated', (data) => this.onTabRatesUpdated(data));

        document.addEventListener('click', () => this.hideContextMenu());
    }

    async showConnectionDialog() {
        const dialog = new ElectronConnectionDialog();
        const result = await dialog.show();

        if (result.confirmed) {
            await this.createConnection(result.config, result.tabName);
        }
    }

    async createConnection(config, tabName) {
        const tabState = this.tabManager.createTab(config, tabName || config.path);
        const service = new IpcSerialProvider();
        
        try {
            await service.open(config, tabName);
            await this.tabManager.connectTab(tabState.id, service);
        } catch (error) {
            console.error('[App] Connection failed:', error);
            this.tabManager.closeTab(tabState.id);
            this.showError(`Failed to connect: ${error.message}`);
        }
    }

    onTabCreated(tabState) {
        const component = new TabComponent(tabState, {
            onClose: (tabId) => this.closeTab(tabId),
            onSwitch: (tabId) => this.switchTab(tabId),
            onSend: (tabId, data) => this.sendData(tabId, data),
            onClear: (tabId) => this.clearTerminal(tabId),
            onContextMenu: (tabId, event) => this.showTabContextMenu(tabId, event)
        });

        component.create();
        this.tabComponents.set(tabState.id, component);

        document.getElementById('tabs-container').appendChild(component.tabElement);
        document.getElementById('tabs-content').appendChild(component.element);

        this.switchTab(tabState.id);
        this.updateEmptyState();
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

    async sendData(tabId, data) {
        const tab = this.tabManager.getTab(tabId);
        if (!tab || !tab.service) return;

        try {
            await tab.service.write(data);
            tab.terminal.appendTransmitted(data);
            this.tabManager.onDataSent(tabId, data);
            
            const component = this.tabComponents.get(tabId);
            if (component) component.updateStatusBar();
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
        const currentIndex = THEME_OPTIONS.findIndex(opt => opt.value === this.theme);
        const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
        this.theme = THEME_OPTIONS[nextIndex].value;
        saveToLocalStorage(STORAGE_KEYS.THEME, this.theme);
        applyTheme(this.theme);
        ipcRenderer.invoke('theme:changed', this.theme, this.theme);
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
    }

    showTabContextMenu(tabId, event) {
        const items = [
            { label: 'Clear Screen', action: () => this.clearTerminal(tabId) },
            { label: 'Copy All Text', action: () => this.copyTabContent(tabId) },
            { label: 'Disconnect/Reconnect', action: () => this.toggleConnection(tabId) }
        ];

        this.showContextMenu(event, items);
    }

    async toggleConnection(tabId) {
        const tab = this.tabManager.getTab(tabId);
        if (!tab) return;
        
        if (tab.connected) {
            await this.tabManager.disconnectTab(tabId);
        } else {
            await this.tabManager.reconnectTab(tabId);
        }
    }

    showContextMenu(event, items) {
        if (!this.contextMenu) return;

        const menuItems = this.contextMenu.querySelector('.context-menu-items');
        menuItems.innerHTML = '';

        items.forEach(item => {
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

    async copyTabContent(tabId) {
        const component = this.tabComponents.get(tabId);
        if (!component) return;

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
            <div class="error-dialog" style="background: var(--glass-surface); padding: 20px; border-radius: 8px; border: 1px solid var(--glass-border); box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                ${message}
                <br><br>
                <button class="btn btn-primary" onclick="this.closest('.error-overlay').remove()">Close</button>
            </div>
        `;
        
        Object.assign(overlay.style, {
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        });
        
        document.body.appendChild(overlay);
    }
}

const app = new PattermElectronApp();
app.init();