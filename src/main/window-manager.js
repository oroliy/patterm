const { BrowserWindow } = require('electron');
const path = require('path');

class WindowManager {
    constructor(debugWindow) {
        this.mainWindow = null;
        this.debugWindow = debugWindow;
    }

    getMainWindow() {
        return this.mainWindow;
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            icon: path.join(__dirname, '../../assets/icon.png'),
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            show: false
        });

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        return this.mainWindow;
    }

    closeAll() {
        if (this.mainWindow) {
            this.mainWindow.close();
        }
    }

    broadcastToTabs(channel, ...args) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, ...args);
        }
    }
}

module.exports = WindowManager;