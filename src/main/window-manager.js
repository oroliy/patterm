const { BrowserWindow, BrowserView } = require('electron');

class WindowManager {
    constructor() {
        this.mainWindow = null;
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
        this.toolbarHeight = 0;
        this.tabsHeight = 0;
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
            setTimeout(() => this.updateLayoutMetrics(), 100);
        });

        this.mainWindow.on('closed', () => {
            this.closeAll();
        });

        this.mainWindow.on('resize', () => {
            this.resize();
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

        const bounds = this.mainWindow.getBounds();
        const yOffset = this.toolbarHeight + this.tabsHeight;
        view.setBounds({
            x: 0,
            y: yOffset,
            width: bounds.width,
            height: bounds.height - yOffset
        });
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
        const yOffset = this.toolbarHeight + this.tabsHeight;
        tab.view.setBounds({
            x: 0,
            y: yOffset,
            width: bounds.width,
            height: bounds.height - yOffset
        });

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

        this.updateLayoutMetrics();

        const bounds = this.mainWindow.getBounds();
        const activeTab = this.tabs.get(this.activeTabId);
        if (activeTab) {
            const yOffset = this.toolbarHeight + this.tabsHeight;
            activeTab.view.setBounds({
                x: 0,
                y: yOffset,
                width: bounds.width,
                height: bounds.height - yOffset
            });
        }
    }

    updateLayoutMetrics() {
        if (!this.mainWindow || !this.mainWindow.webContents) return;

        const bounds = this.mainWindow.getBounds();
        const toolbarHeight = this.mainWindow.webContents.executeJavaScript(`
            const toolbar = document.querySelector('.toolbar');
            const tabsContainer = document.querySelector('.tabs-container');
            return {
                toolbarHeight: toolbar ? toolbar.offsetHeight : 0,
                tabsHeight: tabsContainer ? tabsContainer.offsetHeight : 0
            };
        `).then(result => {
            this.toolbarHeight = result.toolbarHeight;
            this.tabsHeight = result.tabsHeight;
        }).catch(err => {
            console.error('Failed to get layout metrics:', err);
            this.toolbarHeight = 50;
            this.tabsHeight = 40;
        });
    }
}

module.exports = WindowManager;
