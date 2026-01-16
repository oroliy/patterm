const { BrowserWindow } = require('electron');
const path = require('path');

class DebugWindow {
    constructor() {
        this.window = null;
        this.messages = [];
        this.enabled = false;
    }

    toggle() {
        if (this.window) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.window) {
            this.window.focus();
            return;
        }

        this.window = new BrowserWindow({
            width: 800,
            height: 600,
            title: 'Debug Console',
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false
        });

        this.window.once('ready-to-show', () => {
            this.window.show();
        });

        this.window.loadFile(path.join(__dirname, '../renderer/debug-window.html'));

        this.window.on('closed', () => {
            this.window = null;
        });

        this.enabled = true;
    }

    close() {
        if (this.window) {
            this.window.close();
            this.window = null;
        }
        this.enabled = false;
    }

    log(message, level = 'info') {
        if (!this.enabled) {
            this.messages.push({ message, level, timestamp: new Date().toISOString() });
            return;
        }

        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('debug:log', {
                message,
                level,
                timestamp: new Date().toISOString()
            });
        } else {
            this.messages.push({ message, level, timestamp: new Date().toISOString() });
        }
    }

    error(message) {
        this.log(message, 'error');
    }

    warn(message) {
        this.log(message, 'warn');
    }

    info(message) {
        this.log(message, 'info');
    }

    debug(message) {
        this.log(message, 'debug');
    }

    flush() {
        if (this.window && !this.window.isDestroyed() && this.messages.length > 0) {
            this.messages.forEach(msg => {
                this.window.webContents.send('debug:log', msg);
            });
            this.messages = [];
        }
    }

    clear() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('debug:clear');
        }
    }
}

module.exports = DebugWindow;
