const { BrowserWindow, BrowserView } = require('electron');
const path = require('path');

class WindowManager {
    constructor(debugWindow) {
        this.mainWindow = null;
        this.tabs = new Map();
        this.activeTabId = null;
        this.tabCounter = 0;
        this.toolbarHeight = 0;
        this.tabsHeight = 0;
        this.statusBarHeight = 0;
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

    async createNewTab(tabId = null, title = null) {
        if (this.debugWindow) {
            this.debugWindow.log(`createNewTab called with tabId=${tabId}, title=${title}`, 'info');
        }

        const actualTabId = tabId || ++this.tabCounter;
        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });

        // Get layout metrics BEFORE creating the view bounds
        // Always update metrics to ensure statusBarHeight is correct
        await this.updateLayoutMetrics();

        // Use fallback values if metrics failed to load
        if (this.toolbarHeight === 0 || this.tabsHeight === 0 || this.statusBarHeight === 0) {
            this.toolbarHeight = this.toolbarHeight || 50;
            this.tabsHeight = this.tabsHeight || 40;
            this.statusBarHeight = this.statusBarHeight || 24;
        }

        const bounds = this.mainWindow.getBounds();
        const yOffset = this.toolbarHeight + this.tabsHeight;

        if (this.debugWindow) {
            this.debugWindow.log(`Tab bounds: x=0, y=${yOffset}, width=${bounds.width}, height=${bounds.height - yOffset - this.statusBarHeight}`, 'debug');
        }

        // Set bounds BEFORE adding to window to avoid covering toolbar/tabs
        view.setBounds({
            x: 0,
            y: yOffset,
            width: bounds.width,
            height: bounds.height - yOffset - this.statusBarHeight
        });

        view.webContents.loadFile(require('path').join(__dirname, '../renderer/tab.html'));

        view.webContents.on('did-finish-load', () => {
            view.webContents.send('tab:init', { tabId: actualTabId });
            if (this.debugWindow) {
                this.debugWindow.log(`Sent tab:init event to tab ${actualTabId}`, 'info');
            }
        });

        this.tabs.set(actualTabId, {
            id: actualTabId,
            view: view,
            title: title || `Port ${actualTabId}`
        });

        // Don't automatically switch tab - let renderer trigger it after adding tab element
        // if (!this.activeTabId) {
        //     this.switchTab(actualTabId);
        // }

        const result = {
            id: actualTabId,
            title: title || `Port ${actualTabId}`,
            shouldActivate: !this.activeTabId
        };

        if (this.debugWindow) {
            this.debugWindow.log(`Tab created and stored: ${JSON.stringify(result)}`, 'info');
        }

        return result;
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
        if (!tab) {
            return false;
        }

        if (this.activeTabId && this.activeTabId !== tabId) {
            const prevTab = this.tabs.get(this.activeTabId);
            if (prevTab) {
                this.mainWindow.removeBrowserView(prevTab.view);
            }
        }

        const bounds = this.mainWindow.getBounds();
        const yOffset = this.toolbarHeight + this.tabsHeight;

        if (this.debugWindow) {
            this.debugWindow.log(`switchTab bounds: x=0, y=${yOffset}, w=${bounds.width}, h=${bounds.height - yOffset}`, 'info');
            this.debugWindow.log(`toolbarHeight=${this.toolbarHeight}, tabsHeight=${this.tabsHeight}, statusBarHeight=${this.statusBarHeight}`, 'info');
        }

        tab.view.setBounds({
            x: 0,
            y: yOffset,
            width: bounds.width,
            height: bounds.height - yOffset - this.statusBarHeight
        });

        this.mainWindow.addBrowserView(tab.view);
        this.activeTabId = tabId;

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
                height: bounds.height - yOffset - this.statusBarHeight
            });
        }
    }

    async updateLayoutMetrics() {
        if (!this.mainWindow || !this.mainWindow.webContents) return;

        const bounds = this.mainWindow.getBounds();
        try {
            const result = await this.mainWindow.webContents.executeJavaScript(`
                (function() {
                    const toolbar = document.querySelector('.toolbar');
                    const tabsContainer = document.querySelector('.tabs-container');
                    const statusBar = document.querySelector('.main-status-bar');
                    return {
                        toolbarHeight: toolbar ? toolbar.offsetHeight : 0,
                        tabsHeight: tabsContainer ? tabsContainer.offsetHeight : 0,
                        statusBarHeight: statusBar ? statusBar.offsetHeight : 0
                    };
                })()
            `);
            if (this.debugWindow) {
                this.debugWindow.log(`Layout metrics: toolbar=${result.toolbarHeight}px, tabs=${result.tabsHeight}px, statusBar=${result.statusBarHeight}px`, 'info');
            }
            this.toolbarHeight = result.toolbarHeight;
            this.tabsHeight = result.tabsHeight;
            this.statusBarHeight = result.statusBarHeight;
        } catch (err) {
            if (this.debugWindow) {
                this.debugWindow.error(`Failed to get layout metrics: ${err.message}`);
            }
            this.toolbarHeight = 50;
            this.tabsHeight = 40;
            this.statusBarHeight = 24;
        }
    }
    broadcastToTabs(channel, ...args) {
        for (const tab of this.tabs.values()) {
            try {
                tab.view.webContents.send(channel, ...args);
            } catch (error) {
                console.error(`Failed to send to tab ${tab.id}:`, error);
            }
        }
    }
}

module.exports = WindowManager;
