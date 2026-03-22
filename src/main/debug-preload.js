const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, listener) {
    const wrappedListener = (event, data) => {
        listener(data);
    };

    ipcRenderer.on(channel, wrappedListener);

    return () => {
        ipcRenderer.removeListener(channel, wrappedListener);
    };
}

contextBridge.exposeInMainWorld('debugAPI', {
    onLog(listener) {
        return subscribe('debug:log', listener);
    },
    onClear(listener) {
        return subscribe('debug:clear', listener);
    },
});
