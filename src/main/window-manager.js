const { BrowserWindow, BrowserView } = require('electron');

class WindowManager {
    constructor() {
        this.mainWindow = null;
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
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
            this.closeAll();
        });

        return this.mainWindow;
    }

    createNewTab() {
        const tabId = ++this.tabCounter;
        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        view.setBounds({ x: 0, y: 80, width: this.mainWindow.getBounds().width, height: this.mainWindow.getBounds().height - 80 });
        view.webContents.loadFile(require('path').join(__dirname, '../renderer/tab.html'));
        
        this.tabs.set(tabId, {
            id: tabId,
            view: view,
            title: `Port ${tabId}`
        });

        if (!this.activeTabId) {
            this.switchTab(tabId);
        }

        return {
            id: tabId,
            title: `Port ${tabId}`
        };
    }

    closeTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        tab.view.webContents.destroy();
        this.tabs.delete(tabId);

        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(remainingTabs[0]);
            } else {
                this.activeTabId = null;
            }
        }

        return true;
    }

    switchTab(tabId) {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        if (this.activeTabId && this.activeTabId !== tabId) {
            const prevTab = this.tabs.get(this.activeTabId);
            if (prevTab) {
                this.mainWindow.removeBrowserView(prevTab.view);
            }
        }

        this.mainWindow.addBrowserView(tab.view);
        this.activeTabId = tabId;

        const bounds = this.mainWindow.getBounds();
        tab.view.setBounds({ x: 0, y: 80, width: bounds.width, height: bounds.height - 80 });

        return true;
    }

    updateTabTitle(tabId, title) {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.title = title;
            return true;
        }
        return false;
    }

    getTab(tabId) {
        return this.tabs.get(tabId);
    }

    getAllTabs() {
        return Array.from(this.tabs.values()).map(tab => ({
            id: tab.id,
            title: tab.title
        }));
    }

    getActiveTab() {
        return this.tabs.get(this.activeTabId);
    }

    closeAll() {
        for (const [tabId, tab] of this.tabs) {
            tab.view.webContents.destroy();
        }
        this.tabs.clear();
        this.activeTabId = null;
    }

    resize() {
        if (!this.mainWindow || !this.activeTabId) return;

        const bounds = this.mainWindow.getBounds();
        const activeTab = this.tabs.get(this.activeTabId);
        if (activeTab) {
            activeTab.view.setBounds({ x: 0, y: 80, width: bounds.width, height: bounds.height - 80 });
        }
    }
}

module.exports = WindowManager;
