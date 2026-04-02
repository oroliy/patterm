const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, listener, mapArgs = (...args) => args) {
    const wrappedListener = (_event, ...args) => {
        listener(...mapArgs(...args));
    };

    ipcRenderer.on(channel, wrappedListener);

    return () => {
        ipcRenderer.removeListener(channel, wrappedListener);
    };
}

contextBridge.exposeInMainWorld('electronAPI', {
    onNewConnection(listener) {
        return subscribe('menu:new-connection', listener, () => []);
    },
    onThemeSet(listener) {
        return subscribe('theme:set', listener, (theme) => [theme]);
    },
    notifyThemeChanged(theme, effectiveTheme, themeVariant) {
        return ipcRenderer.invoke('theme:changed', theme, effectiveTheme, themeVariant);
    },
    getBuildInfo() {
        return ipcRenderer.invoke('app:getBuildInfo');
    },
    saveOutput(content, fileName) {
        return ipcRenderer.invoke('dialog:saveContent', {
            content,
            defaultPath: fileName,
            filters: [
                { name: 'Text Files', extensions: ['txt', 'log'] },
            ],
        });
    },
    listSerialPorts() {
        return ipcRenderer.invoke('serial:listPorts');
    },
    createConnection(config, tabName) {
        return ipcRenderer.invoke('connection:create', config, tabName);
    },
    writeSerial(tabId, data) {
        return ipcRenderer.invoke('serial:write', tabId, data);
    },
    disconnectSerial(tabId) {
        return ipcRenderer.invoke('serial:disconnect', tabId);
    },
    reconnectSerial(tabId) {
        return ipcRenderer.invoke('serial:reconnect', tabId);
    },
    onSerialData(listener) {
        return subscribe('serial:data', listener, (tabId, data) => [tabId, data]);
    },
    onSerialError(listener) {
        return subscribe('serial:error', listener, (tabId, error) => [tabId, error]);
    },
    onSerialConnected(listener) {
        return subscribe('serial:connected', listener, (tabId, connected) => [tabId, connected]);
    },
});
