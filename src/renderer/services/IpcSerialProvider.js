import { EventManager } from '../../web/js/services/EventManager.js';

export class IpcSerialProvider extends EventManager {
    constructor() {
        super();
        this.ipcRenderer = window.require('electron').ipcRenderer;
        this.tabId = null;
        this.config = null;
        this.isConnected = false;

        // Note: Global listeners should be managed so we don't leak,
        // but for now we bind once per instance and filter by tabId.
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
                this.isConnected = connected;
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
        this.config = config;
        // In Electron, we call connection:create which opens the port in the Main process
        const result = await this.ipcRenderer.invoke('connection:create', config, tabName);
        if (!result.success) {
            throw new Error(result.error || 'Failed to open connection');
        }
        
        this.tabId = result.tabId;
        this.isConnected = true;
        this.emit('open', { config });
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
            this.isConnected = false;
        }
        this.cleanup();
    }

    async reconnect() {
        if (!this.config || !this.tabId) {
            throw new Error('No previous configuration found. Cannot reconnect.');
        }
        const result = await this.ipcRenderer.invoke('serial:reconnect', this.tabId);
        if (result) {
            this.isConnected = true;
        }
    }

    cleanup() {
        this.ipcRenderer.removeListener('serial:data', this._handleData);
        this.ipcRenderer.removeListener('serial:error', this._handleError);
        this.ipcRenderer.removeListener('serial:connected', this._handleConnected);
    }

    getConfig() {
        return { ...this.config };
    }

    getState() {
        return {
            isConnected: this.isConnected,
            config: this.getConfig()
        };
    }
}
