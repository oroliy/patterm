import { AppShell } from '../../shared/js/app/AppShell.js';
import { WebSerialProvider } from './services/SerialService.js';
import { LogManager } from './services/LogManager.js';
import { ConnectionDialog } from './components/ConnectionDialog.js';
import { normalizeSerialConfig } from '../../shared/js/serial/normalizeSerialConfig.js';
import { applyTheme } from './utils/helpers.js';
import { debug } from './utils/debug.js';

const WEB_BUILD_INFO = {
    version: typeof __PATTERM_VERSION__ !== 'undefined' ? __PATTERM_VERSION__ : '0.6.0',
    commitId: typeof __PATTERM_COMMIT_ID__ !== 'undefined' ? __PATTERM_COMMIT_ID__ : 'dev',
};

class PattermApp extends AppShell {
    async init() {
        if (!this.checkBrowserSupport()) {
            return;
        }
        await super.init();
    }

    checkBrowserSupport() {
        if (!WebSerialProvider.isSupported()) {
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

    registerPlatformEventHandlers() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (this.theme === 'system') {
                applyTheme(this.theme, this.themeVariant || 'default');
            }
        });
    }

    shouldPersistSession() {
        return true;
    }

    afterInit() {
        this.initServiceWorker();
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

        const normalizedConfig = normalizeSerialConfig(config);
        const tabState = this.tabManager.createTab(normalizedConfig, tabName || `Port ${normalizedConfig.baudRate}`);
        const service = new WebSerialProvider();
        service.port = port;

        debug.log('[App] About to open port with config:', normalizedConfig);

        try {
            await service.open(normalizedConfig);
            debug.log('[App] Port opened successfully');
            await this.tabManager.connectTab(tabState.id, service);
        } catch (error) {
            debug.error('[App] Connection failed:', error);
            this.tabManager.closeTab(tabState.id);
            this.showError(`Failed to connect: ${error.message}\n\n${error.stack}`);
        }
    }

    getTabContextMenuItems(tabId) {
        return [
            { label: 'Clear Screen', action: () => this.clearTerminal(tabId) },
            { label: 'Save Output', action: () => this.saveTabOutput(tabId) },
            { label: 'Copy All Text', action: () => this.copyTabContent(tabId) }
        ];
    }

    getTabSaveHandler() {
        return async (content, fileName) => {
            const logManager = new LogManager();
            return logManager.saveTabContent(content, fileName);
        };
    }

    async saveTabOutput(tabId) {
        const component = this.tabComponents.get(tabId);
        if (!component) {
            return;
        }

        const logManager = new LogManager();
        const content = component.terminal.getContent();
        await logManager.saveTabContent(content);
    }

    async copyTabContent(tabId) {
        const component = this.tabComponents.get(tabId);
        if (!component) {
            return;
        }

        try {
            await component.terminal.copyAll();
        } catch (error) {
            debug.error('Failed to copy:', error);
        }
    }

    getAboutSummary() {
        return 'A lightweight serial workspace for the browser, built around Web Serial, fast tab switching, and searchable terminal history.';
    }

    getAboutSurfaceLabel() {
        return 'Web Serial';
    }

    async getAboutBuildInfo() {
        return WEB_BUILD_INFO;
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
window.app = app;
app.init();
