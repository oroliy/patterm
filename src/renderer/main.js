import { AppShell } from '../shared/js/app/AppShell.js';
import { normalizeSerialConfig } from '../shared/js/serial/normalizeSerialConfig.js';
import { ElectronConnectionDialog } from './ElectronConnectionDialog.js';
import { ElectronSerialProvider } from './services/IpcSerialProvider.js';

const { ipcRenderer } = window.require('electron');

export class ElectronTabShell {
    constructor(tabState, options = {}) {
        this.tabState = tabState;
        this.options = options;
        this.tabElement = null;
        this.element = null;
    }

    create() {
        const tabElement = document.createElement('div');
        tabElement.className = 'tab';
        tabElement.dataset.tabId = this.tabState.id;
        tabElement.innerHTML = `
            <span class="tab-status ${this.tabState.connected ? 'connected' : ''}"></span>
            <span class="tab-name">${this.escapeHtml(this.tabState.name)}</span>
            <button class="tab-close-btn" aria-label="Close tab">×</button>
        `;

        tabElement.querySelector('.tab-close-btn')?.addEventListener('click', (event) => {
            event.stopPropagation();
            this.options.onClose?.(this.tabState.id);
        });
        tabElement.addEventListener('click', () => {
            this.options.onSwitch?.(this.tabState.id);
        });

        this.tabElement = tabElement;
        return this;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setActive(active) {
        this.tabElement?.classList.toggle('active', active);
    }

    setName(name) {
        this.tabState.name = name;
        const label = this.tabElement?.querySelector('.tab-name');
        if (label) {
            label.textContent = name;
        }
    }

    updateConnectionState(connected) {
        this.tabState.connected = connected;
        this.tabElement?.querySelector('.tab-status')?.classList.toggle('connected', connected);
    }

    updatePortName() {
    }

    updateStatusBar() {
    }

    updateRates() {
    }

    focusSearch() {
    }

    renderWorkflows() {
    }

    renderWorkflowRuntime() {
    }

    updateWorkflowRuntime() {
    }

    destroy() {
        this.tabElement?.remove();
        this.element?.remove?.();
    }
}

export class PattermElectronApp extends AppShell {
    onTabCreated(tabState) {
        const component = new ElectronTabShell(tabState, {
            onClose: (tabId) => this.closeTab(tabId),
            onSwitch: (tabId) => this.switchTab(tabId),
        }).create();

        this.tabComponents.set(tabState.id, component);
        document.getElementById('tabs-container').appendChild(component.tabElement);

        this.switchTab(tabState.id);
        this.updateEmptyState();
        this.persistSession();
    }

    onTabData() {
    }

    onTabError() {
    }

    onTabRatesUpdated() {
    }

    registerPlatformEventHandlers() {
        ipcRenderer.on('menu:new-connection', () => this.showConnectionDialog());
        ipcRenderer.on('theme:set', (event, theme) => {
            this.theme = theme;
            this.initTheme();
        });
    }

    registerCommandPaletteCommands() {
        super.registerCommandPaletteCommands();
        this.commandPaletteCommands = this.commandPaletteCommands.filter((command) => ![
            'search-current-tab',
            'search-all-tabs',
            'toggle-transactions',
            'toggle-workflows',
            'clear-active-terminal',
        ].includes(command.id));
    }

    async showConnectionDialog() {
        const dialog = new ElectronConnectionDialog();
        const result = await dialog.show();

        if (result.confirmed) {
            await this.createConnection(result.config, result.tabName);
        }
    }

    async createConnection(config, tabName) {
        const normalizedConfig = normalizeSerialConfig(config);
        const tabState = this.tabManager.createTab(normalizedConfig, tabName || normalizedConfig.path);
        const service = new ElectronSerialProvider();

        try {
            await service.open(normalizedConfig, tabName);
            await this.tabManager.connectTab(tabState.id, service);
        } catch (error) {
            console.error('[App] Connection failed:', error);
            this.tabManager.closeTab(tabState.id);
            this.showError(`Failed to connect: ${error.message}`);
        }
    }

    getTabContextMenuItems(tabId) {
        return [
            { label: 'Disconnect/Reconnect', action: () => this.toggleConnection(tabId) }
        ];
    }

    async toggleConnection(tabId) {
        const tab = this.tabManager.getTab(tabId);
        if (!tab) {
            return;
        }

        if (tab.connected) {
            await this.tabManager.disconnectTab(tabId);
        } else {
            await this.tabManager.reconnectTab(tabId);
        }
    }

    onThemeChanged(theme) {
        ipcRenderer.invoke('theme:changed', theme, theme);
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
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
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
