const SerialService = require('./serial-service');
const path = require('path');

class SerialServiceManager {
    constructor() {
        this.services = new Map();
        this.tabCounter = 0;
    }

    async createService(tabId, config, tabName) {
        if (this.services.has(tabId)) {
            await this.closeService(tabId);
        }

        const service = new SerialService();
        const serviceConfig = {
            ...service.getDefaultConfig(),
            ...config
        };

        await service.open(serviceConfig);

        const tabData = {
            id: tabId,
            service: service,
            config: serviceConfig,
            tabName: tabName || config.path,
            connected: true,
            connectionWindow: null
        };

        this.services.set(tabId, tabData);
        return tabData;
    }

    getService(tabId) {
        return this.services.get(tabId);
    }

    async openConnection(tabId, config, tabName) {
        const tabData = await this.createService(tabId, config, tabName);
        return {
            id: tabId,
            tabName: tabData.tabName,
            connected: true,
            portPath: config.path
        };
    }

    async closeConnection(tabId) {
        const tabData = this.services.get(tabId);
        if (!tabData) return false;

        if (tabData.service && tabData.service.isOpen()) {
            await tabData.service.close();
        }

        this.services.delete(tabId);
        return true;
    }

    async write(tabId, data) {
        const tabData = this.services.get(tabId);
        if (!tabData || !tabData.service) {
            throw new Error('Service not found for tab');
        }

        return tabData.service.write(data);
    }

    getConfig(tabId) {
        const tabData = this.services.get(tabId);
        if (!tabData) return null;

        return tabData.config;
    }

    getTabInfo(tabId) {
        const tabData = this.services.get(tabId);
        if (!tabData) return null;

        return {
            id: tabId,
            tabName: tabData.tabName,
            connected: tabData.connected,
            portPath: tabData.config.path,
            baudRate: tabData.config.baudRate
        };
    }

    getAllTabInfos() {
        return Array.from(this.services.values()).map(tabData => ({
            id: tabData.id,
            tabName: tabData.tabName,
            connected: tabData.connected,
            portPath: tabData.config.path,
            baudRate: tabData.config.baudRate
        }));
    }

    onData(tabId, callback) {
        const tabData = this.services.get(tabId);
        if (!tabData || !tabData.service) return;

        tabData.service.on('data', callback);
    }

    offData(tabId, callback) {
        const tabData = this.services.get(tabId);
        if (!tabData || !tabData.service) return;

        tabData.service.off('data', callback);
    }

    onError(tabId, callback) {
        const tabData = this.services.get(tabId);
        if (!tabData || !tabData.service) return;

        tabData.service.on('error', callback);
    }

    offError(tabId, callback) {
        const tabData = this.services.get(tabId);
        if (!tabData || !tabData.service) return;

        tabData.service.off('error', callback);
    }

    isConnected(tabId) {
        const tabData = this.services.get(tabId);
        if (!tabData) return false;

        return tabData.service.isOpen();
    }

    updateTabName(tabId, tabName) {
        const tabData = this.services.get(tabId);
        if (!tabData) return false;

        tabData.tabName = tabName;
        return true;
    }

    async closeAll() {
        for (const [tabId, tabData] of this.services) {
            if (tabData.service && tabData.service.isOpen()) {
                await tabData.service.close();
            }
        }
        this.services.clear();
    }

    async listPorts() {
        const tempService = new SerialService();
        return tempService.listPorts();
    }
}

module.exports = SerialServiceManager;
