import { AppShell } from '../shared/js/app/AppShell.js';
import { getEffectiveTheme } from '../shared/js/theme.js';
import { normalizeSerialConfig } from '../shared/js/serial/normalizeSerialConfig.js';
import { ElectronConnectionDialog } from './ElectronConnectionDialog.js';
import { ElectronSerialProvider } from './services/IpcSerialProvider.js';

const { ipcRenderer } = window.require('electron');
const fs = window.require('fs');

export class PattermElectronApp extends AppShell {
    registerPlatformEventHandlers() {
        ipcRenderer.on('menu:new-connection', () => this.showConnectionDialog());
        ipcRenderer.on('theme:set', (event, theme) => {
            this.theme = theme;
            this.initTheme();
            this.updateThemeButton();
        });
    }

    getTabSaveHandler() {
        return async (content, fileName) => {
            const filePath = await ipcRenderer.invoke('dialog:saveFile', {
                defaultPath: fileName,
                filters: [
                    { name: 'Text Files', extensions: ['txt', 'log'] },
                ],
            });

            if (!filePath) {
                return false;
            }

            await fs.promises.writeFile(filePath, content, 'utf8');
            return true;
        };
    }

    async showConnectionDialog(tabId = null) {
        const dialog = new ElectronConnectionDialog();
        const result = await dialog.show();

        if (result.confirmed) {
            if (tabId) {
                await this.reconnectWithNewService(tabId, result.config, result.tabName);
            } else {
                await this.createConnection(result.config, result.tabName);
            }
        }
    }

    async createConnection(config, tabName) {
        const normalizedConfig = normalizeSerialConfig(config);
        const tabState = this.tabManager.createTab(normalizedConfig, tabName || normalizedConfig.path);
        const service = new ElectronSerialProvider();

        try {
            await service.open(normalizedConfig, tabName || tabState.name);
            await this.tabManager.connectTab(tabState.id, service);
        } catch (error) {
            console.error('[App] Connection failed:', error);
            this.tabManager.closeTab(tabState.id);
            this.showError(`Failed to connect: ${error.message}`);
        }
    }

    async reconnectTab(tabId) {
        const tab = this.tabManager.getTab(tabId);
        if (tab && !tab.service) {
            const service = new ElectronSerialProvider();
            try {
                await service.open(tab.config, tab.name);
                await this.tabManager.connectTab(tabId, service);
                return;
            } catch (error) {
                this.showError(`Failed to reconnect: ${error.message}`);
                return;
            }
        }
        await super.reconnectTab(tabId);
    }

    async reconnectWithNewService(tabId, config, tabName) {
        const tab = this.tabManager.getTab(tabId);
        if (!tab) return;

        const normalizedConfig = normalizeSerialConfig(config);
        const service = new ElectronSerialProvider();

        try {
            await service.open(normalizedConfig, tabName || tab.name);
            if (tabName) {
                tab.name = tabName;
                this.tabComponents.get(tabId)?.setName(tabName);
            }
            tab.config = normalizedConfig;
            await this.tabManager.connectTab(tabId, service);
        } catch (error) {
            this.showError(`Failed to reconnect: ${error.message}`);
        }
    }

    getTabContextMenuItems(tabId) {
        return [
            { label: 'Clear Screen', action: () => this.clearTerminal(tabId) },
            { label: 'Copy All Text', action: () => this.copyTabContent(tabId) },
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

    onThemeChanged(theme, effectiveTheme, themeVariant) {
        ipcRenderer.invoke('theme:changed', theme, effectiveTheme || getEffectiveTheme(theme), themeVariant || this.themeVariant);
    }

    async getAboutBuildInfo() {
        return ipcRenderer.invoke('app:getBuildInfo');
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
