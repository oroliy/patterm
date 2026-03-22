import { BaseSerialProvider } from '../../shared/js/serial/BaseSerialProvider.js';
import { normalizeSerialConfig } from '../../shared/js/serial/normalizeSerialConfig.js';

const electronAPI = window.electronAPI;

export class ElectronSerialProvider extends BaseSerialProvider {
    constructor() {
        super();
        this.tabId = null;

        this._handleData = (tabId, data) => {
            if (this.tabId === tabId) {
                this.emit('data', data);
            }
        };

        this._handleError = (tabId, error) => {
            if (this.tabId === tabId) {
                this.emit('error', new Error(error));
            }
        };

        this._handleConnected = (tabId, connected) => {
            if (this.tabId === tabId) {
                this.setConnected(connected);
                if (!connected) {
                    this.emit('close');
                } else {
                    this.emit('open');
                }
            }
        };

        this._unsubscribeData = electronAPI.onSerialData(this._handleData);
        this._unsubscribeError = electronAPI.onSerialError(this._handleError);
        this._unsubscribeConnected = electronAPI.onSerialConnected(this._handleConnected);
    }

    async open(config, tabName) {
        const normalizedConfig = normalizeSerialConfig(config);
        const result = await electronAPI.createConnection(normalizedConfig, tabName);
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
        const result = await electronAPI.writeSerial(this.tabId, data);
        if (!result) {
            throw new Error('Failed to write data');
        }
    }

    async disconnect() {
        if (this.tabId) {
            await electronAPI.disconnectSerial(this.tabId);
            this.setConnected(false);
        }
        this.cleanup();
    }

    async reconnect() {
        const config = this.getConfig();
        if (!config || !this.tabId) {
            throw new Error('No previous configuration found. Cannot reconnect.');
        }
        const result = await electronAPI.reconnectSerial(this.tabId);
        if (result) {
            this.setConnected(true);
        }
    }

    cleanup() {
        this._unsubscribeData?.();
        this._unsubscribeError?.();
        this._unsubscribeConnected?.();
    }
}

export const IpcSerialProvider = ElectronSerialProvider;
