import { BaseSerialProvider } from '../../shared/js/serial/BaseSerialProvider.js';
import { normalizeSerialConfig } from '../../shared/js/serial/normalizeSerialConfig.js';

export class ElectronSerialProvider extends BaseSerialProvider {
    constructor() {
        super();
        this.ipcRenderer = window.require('electron').ipcRenderer;
        this.tabId = null;

        this._handleData = (event, tabId, data) => {
            if (this.tabId === tabId) {
                this.emit('data', data);
            }
        };

        this._handleError = (event, tabId, error) => {
            if (this.tabId === tabId) {
                this.emit('error', new Error(error));
            }
        };

        this._handleConnected = (event, tabId, connected) => {
            if (this.tabId === tabId) {
                this.setConnected(connected);
                if (!connected) {
                    this.emit('close');
                } else {
                    this.emit('open');
                }
            }
        };

        this.ipcRenderer.on('serial:data', this._handleData);
        this.ipcRenderer.on('serial:error', this._handleError);
        this.ipcRenderer.on('serial:connected', this._handleConnected);
    }

    async open(config, tabName) {
        const normalizedConfig = normalizeSerialConfig(config);
        const result = await this.ipcRenderer.invoke('connection:create', normalizedConfig, tabName);
        if (!result.success) {
            throw new Error(result.error || 'Failed to open connection');
        }

        this.tabId = result.tabId;
        this.setConfig(normalizedConfig);
        this.setConnected(true);
        this.emit('open', { config: normalizedConfig });
    }

    async write(data) {
        if (!this.isConnected || !this.tabId) {
            throw new Error('Port is not open.');
        }
        const result = await this.ipcRenderer.invoke('serial:write', this.tabId, data);
        if (!result) {
            throw new Error('Failed to write data');
        }
    }

    async disconnect() {
        if (this.tabId) {
            await this.ipcRenderer.invoke('serial:disconnect', this.tabId);
            this.setConnected(false);
        }
        this.cleanup();
    }

    async reconnect() {
        const config = this.getConfig();
        if (!config || !this.tabId) {
            throw new Error('No previous configuration found. Cannot reconnect.');
        }
        const result = await this.ipcRenderer.invoke('serial:reconnect', this.tabId);
        if (result) {
            this.setConnected(true);
        }
    }

    cleanup() {
        this.ipcRenderer.removeListener('serial:data', this._handleData);
        this.ipcRenderer.removeListener('serial:error', this._handleError);
        this.ipcRenderer.removeListener('serial:connected', this._handleConnected);
    }
}

export const IpcSerialProvider = ElectronSerialProvider;
