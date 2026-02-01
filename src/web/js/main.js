import { SerialService, listAvailablePorts } from './services/SerialService.js';
import { TabManager } from './services/TabManager.js';
import { LogManager } from './services/LogManager.js';
import { globalEvents } from './services/EventManager.js';
import { ConnectionDialog } from './components/ConnectionDialog.js';
import { TabComponent } from './components/TabComponent.js';
import { STORAGE_KEYS, DEFAULT_SERIAL_CONFIG, THEME_OPTIONS } from './utils/constants.js';
import { applyTheme, getEffectiveTheme, saveToLocalStorage, loadFromLocalStorage } from './utils/helpers.js';
import { debug } from './utils/debug.js';

class PattermApp {
    constructor() {
        this.tabManager = new TabManager();
        this.tabComponents = new Map();
        this.theme = loadFromLocalStorage(STORAGE_KEYS.THEME, 'system');
        this.contextMenu = null;
    }

    async init() {
        this.checkBrowserSupport();
        this.initTheme();
        this.registerEventHandlers();
        this.initContextMenu();
        this.initServiceWorker();
        this.updateEmptyState();
    }

    checkBrowserSupport() {
        if (!SerialService.isSupported()) {
            this.showError(`
                <h2>Web Serial API Not Supported</h2>
                <p>Your browser does not support the Web Serial API. Please use one of the following:</p>
                <ul>
                    <li>Google Chrome 89+</li>
                    <li>Microsoft Edge 89+</li>
                    <li>Opera 75+</li>
                </ul>
                <p>Firefox and Safari are not supported.</p>
            `);
            return false;
        }
        return true;
    }

    initTheme() {
        applyTheme(this.theme);
    }

    registerEventHandlers() {
        document.getElementById('new-tab-btn')?.addEventListener('click', () => this.showConnectionDialog());
        document.getElementById('empty-new-connection-btn')?.addEventListener('click', () => this.showConnectionDialog());
        document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('about-btn')?.addEventListener('click', () => this.showAbout());

        globalEvents.on('tab:created', (data) => this.onTabCreated(data));
        globalEvents.on('tab:connected', (data) => this.onTabConnected(data));
        globalEvents.on('tab:disconnected', (data) => this.onTabDisconnected(data));
        globalEvents.on('tab:closed', (data) => this.onTabClosed(data));
        globalEvents.on('tab:switched', (data) => this.onTabSwitched(data));
        globalEvents.on('tab:data', (data) => this.onTabData(data));
        globalEvents.on('tab:error', (data) => this.onTabError(data));
        globalEvents.on('tab:ratesUpdated', (data) => this.onTabRatesUpdated(data));

        document.addEventListener('click', () => this.hideContextMenu());

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            applyTheme(this.theme);
        });
    }

    async showConnectionDialog() {
        const dialog = new ConnectionDialog();
        const result = await dialog.show();

        if (result.confirmed) {
            await this.createConnection(result.config, result.tabName, result.port);
        }
    }

    async createConnection(config, tabName, port) {
        debug.log('[App] createConnection called with:', { config, tabName, port });

        if (!port) {
            this.showError('No port selected. Please select a serial port first.');
            return;
        }

        const tabState = this.tabManager.createTab(config, tabName || `Port ${config.baudRate}`);
        const service = new SerialService();
        service.port = port;

        debug.log('[App] About to open port with config:', config);

        try {
            await service.open(config);
            debug.log('[App] Port opened successfully');
            await this.tabManager.connectTab(tabState.id, service);
        } catch (error) {
            debug.error('[App] Connection failed:', error);
            this.tabManager.closeTab(tabState.id);
            this.showError(`Failed to connect: ${error.message}\n\n${error.stack}`);
            return;
        }
    }

    onTabCreated(tabState) {
        debug.log('[App] onTabCreated called with tabState:', tabState);
        debug.log('[App] tabState.id:', tabState?.id);
        debug.log('[App] tabState keys:', Object.keys(tabState || {}));

        const component = new TabComponent(tabState, {
            onClose: (tabId) => this.closeTab(tabId),
            onSwitch: (tabId) => this.switchTab(tabId),
            onSend: (tabId, data) => this.sendData(tabId, data),
            onClear: (tabId) => this.clearTerminal(tabId),
            onContextMenu: (tabId, event) => this.showTabContextMenu(tabId, event)
        });

        component.create();
        this.tabComponents.set(tabState.id, component);

        const tabsContainer = document.getElementById('tabs-container');
        tabsContainer.appendChild(component.tabElement);
        debug.log('[App] Tab element appended to tabs-container');

        const tabsContent = document.getElementById('tabs-content');
        tabsContent.appendChild(component.element);
        debug.log('[App] Tab content appended to tabs-content');

        this.switchTab(tabState.id);
        this.updateEmptyState();
        debug.log('[App] onTabCreated completed');
    }

    onTabConnected(data) {
        debug.log('[App] onTabConnected called with data:', data);
        debug.log('[App] data type:', typeof data);
        debug.log('[App] data keys:', data ? Object.keys(data) : 'data is null/undefined');

        const tabId = data?.tabId;
        debug.log('[App] Extracted tabId:', tabId);

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
        if (!tab || !tab.service) {
            return;
        }

        try {
            await tab.service.write(data);
            tab.terminal.appendTransmitted(data);
            this.tabManager.onDataSent(tabId, data);
            
            // Update status bar to reflect new TX bytes
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
        const currentIndex = THEME_OPTIONS.findIndex(opt => opt.value === this.theme);
        const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length;
        this.theme = THEME_OPTIONS[nextIndex].value;
        saveToLocalStorage(STORAGE_KEYS.THEME, this.theme);
        applyTheme(this.theme);
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
            { label: 'Save Output', action: () => this.saveTabOutput(tabId) },
            { label: 'Copy All Text', action: () => this.copyTabContent(tabId) }
        ];

        this.showContextMenu(event, items);
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

    async saveTabOutput(tabId) {
        const component = this.tabComponents.get(tabId);
        if (!component) return;

        const logManager = new LogManager();
        const content = component.terminal.getContent();
        await logManager.saveTabContent(content);
    }

    async copyTabContent(tabId) {
        const component = this.tabComponents.get(tabId);
        if (!component) return;

        try {
            await component.terminal.copyAll();
        } catch (error) {
            debug.error('Failed to copy:', error);
        }
    }

    showAbout() {
        const aboutHtml = `
            <div class="about-dialog">
                <h2>Patterm Web</h2>
                <p>Version 0.1.0</p>
                <p>Professional Serial Terminal for the Web</p>
                <hr>
                <p><strong>Features:</strong></p>
                <ul>
                    <li>Multi-tab serial connections</li>
                    <li>Real-time data transmission</li>
                    <li>Configurable serial parameters</li>
                    <li>Terminal output export</li>
                    <li>Dark/Light theme support</li>
                </ul>
                <hr>
                <p><strong>Powered by:</strong></p>
                <p>Web Serial API</p>
                <p><a href="https://github.com/oroliy/patterm" target="_blank">https://github.com/oroliy/patterm</a></p>
                <button class="btn btn-primary" onclick="this.closest('.about-overlay').remove()">Close</button>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'about-overlay';
        overlay.innerHTML = aboutHtml;
        document.body.appendChild(overlay);
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

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(() => debug.log('[SW] Registered'))
                    .catch((error) => debug.error('[SW] Registration failed:', error));
            });
        }
    }
}

const app = new PattermApp();
window.app = app;  // Expose for testing
app.init();
