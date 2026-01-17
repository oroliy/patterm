const { app, BrowserWindow, ipcMain, Menu, dialog, nativeTheme } = require('electron');
const path = require('path');
const WindowManager = require('./window-manager');
const SerialServiceManager = require('../services/serial-service-manager');
const DebugWindow = require('./debug-window');

let windowManager;
let serialServiceManager;
let debugWindow;
let currentTheme = 'system';

function createWindow() {
    debugWindow = new DebugWindow();
    windowManager = new WindowManager(debugWindow);
    serialServiceManager = new SerialServiceManager();

    const mainWindow = windowManager.createMainWindow();

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.on('closed', () => {
        windowManager.closeAll();
        serialServiceManager.closeAll();
        debugWindow.close();
    });

    setupIpcHandlers();
    setupMenu();
}

function setupIpcHandlers() {
    ipcMain.handle('serial:listPorts', async () => {
        return serialServiceManager.listPorts();
    });

    ipcMain.handle('connection:create', async (event, config, tabName) => {
        try {
            debugWindow.log(`connection:create called with config: ${JSON.stringify(config)}, tabName: ${tabName}`, 'info');

            const tabId = ++windowManager.tabCounter;
            debugWindow.log(`Generated tabId: ${tabId}`, 'info');

            const result = await serialServiceManager.openConnection(tabId, config, tabName);
            debugWindow.log(`Serial connection opened: ${JSON.stringify(result)}`, 'info');

            const tab = await windowManager.createNewTab(tabId, result.tabName);
            debugWindow.log(`Tab created: ${JSON.stringify(tab)}`, 'info');

            serialServiceManager.onData(tabId, (data) => {
                const tabInfo = windowManager.getTab(tabId);
                if (tabInfo && tabInfo.view) {
                    tabInfo.view.webContents.send('serial:data', data);
                }
            });

            serialServiceManager.onError(tabId, (error) => {
                const tabInfo = windowManager.getTab(tabId);
                if (tabInfo && tabInfo.view) {
                    tabInfo.view.webContents.send('serial:error', error);
                }
            });

            const tabInfo = windowManager.getTab(tabId);

            debugWindow.log(`Tab info from manager: ${JSON.stringify(tabInfo)}`, 'info');

            if (tabInfo && tabInfo.view) {
                debugWindow.log(`Sending serial:connected event to tab ${tabId}`, 'info');
                tabInfo.view.webContents.send('serial:connected', true);

                tabInfo.view.webContents.on('ipc-message', (event, channel, ...args) => {
                    if (channel === 'tab:scrollStateChanged') {
                        const mainWindow = windowManager.getMainWindow();
                        if (mainWindow) {
                            mainWindow.webContents.send('tab:scrollStateChanged', ...args);
                        }
                    }
                });
            }

            const mainWindow = windowManager.getMainWindow();
            debugWindow.log(`Main window: ${mainWindow ? 'found' : 'not found'}`, 'info');

            if (mainWindow) {
                debugWindow.log(`Sending tab:created event to main window`, 'info');
                mainWindow.webContents.send('tab:created', {
                    id: tabId,
                    tabName: result.tabName,
                    connected: true,
                    shouldActivate: tab.shouldActivate
                });
            }

            return {
                success: true,
                tabId: tabId,
                tabInfo: result
            };
        } catch (error) {
            debugWindow.error(`connection:create failed: ${error.message}`, 'error');
            return {
                success: false,
                error: error.message
            };
        }
    });

    ipcMain.handle('serial:close', async (event, tabId) => {
        const result = await serialServiceManager.closeConnection(tabId);
        return result;
    });

    ipcMain.handle('serial:write', async (event, tabId, data) => {
        return serialServiceManager.write(tabId, data);
    });

    ipcMain.handle('serial:disconnect', async (event, tabId) => {
        const result = await serialServiceManager.closeConnection(tabId);
        const tabInfo = windowManager.getTab(tabId);
        if (tabInfo && tabInfo.view) {
            tabInfo.view.webContents.send('serial:connected', false);
        }
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow) {
            mainWindow.webContents.send('tab:statusChanged', tabId, false);
        }
        return result;
    });

    ipcMain.handle('serial:reconnect', async (event, tabId) => {
        const tabData = serialServiceManager.getService(tabId);
        if (!tabData || !tabData.config) {
            throw new Error('No previous connection configuration found');
        }
        const result = await serialServiceManager.openConnection(tabId, tabData.config, tabData.tabName);
        const tabInfo = windowManager.getTab(tabId);
        if (tabInfo && tabInfo.view) {
            tabInfo.view.webContents.send('serial:connected', true);
        }
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow) {
            mainWindow.webContents.send('tab:statusChanged', tabId, true);
        }
        return result;
    });

    ipcMain.handle('serial:getConfig', async (event, tabId) => {
        return serialServiceManager.getConfig(tabId);
    });

    ipcMain.handle('window:newTab', async (event, tabId, title) => {
        return windowManager.createNewTab(tabId, title);
    });

    ipcMain.handle('window:closeTab', async (event, tabId) => {
        const result = windowManager.closeTab(tabId);
        await serialServiceManager.removeConnection(tabId);
        return result;
    });

    ipcMain.handle('window:switchTab', async (event, tabId) => {
        return windowManager.switchTab(tabId);
    });

    ipcMain.handle('window:resize', async () => {
        return windowManager.resize();
    });

    ipcMain.handle('window:recalcLayout', async () => {
        return windowManager.updateLayoutMetrics();
    });

    ipcMain.handle('window:showConnectionDialog', async () => {
        return showConnectionDialog();
    });

    ipcMain.handle('window:updateTabTitle', async (event, tabId, title) => {
        serialServiceManager.updateTabName(tabId, title);
        return windowManager.updateTabTitle(tabId, title);
    });

    ipcMain.handle('tab:toggleScroll', async (event, tabId) => {
        const tabInfo = windowManager.getTab(tabId);
        if (tabInfo && tabInfo.view) {
            tabInfo.view.webContents.send('tab:toggleScroll');
            return { success: true };
        }
        return { success: false };
    });

    ipcMain.handle('log:start', async (event, tabId, filePath, mode) => {
        const tabData = serialServiceManager.getService(tabId);
        if (!tabData) {
            throw new Error('Service not found for tab');
        }
        return tabData.service.startLogging(filePath, mode);
    });

    ipcMain.handle('log:stop', async (event, tabId) => {
        const tabData = serialServiceManager.getService(tabId);
        if (!tabData) {
            throw new Error('Service not found for tab');
        }
        return tabData.service.stopLogging();
    });

    ipcMain.handle('app:getVersion', async () => {
        return app.getVersion();
    });

    ipcMain.handle('dialog:saveFile', async (event, options) => {
        const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), options);
        return result.filePath;
    });

    ipcMain.handle('debug:toggle', async () => {
        debugWindow.toggle();
        debugWindow.flush();
    });

    ipcMain.handle('debug:log', async (event, message, level) => {
        debugWindow.log(message, level);
    });

    ipcMain.handle('theme:changed', async (event, originalTheme, effectiveTheme) => {
        currentTheme = originalTheme;
        nativeTheme.themeSource = originalTheme; // Use original ('system', 'light', or 'dark')
        windowManager.broadcastToTabs('theme:update', effectiveTheme); // Send effective theme to tabs
        return true;
    });

    ipcMain.handle('theme:get', async () => {
        return currentTheme;
    });
}

function showConnectionDialog() {
    return new Promise((resolve) => {
        const dialogWindow = new BrowserWindow({
            width: 500,
            height: 550,
            resizable: false,
            modal: true,
            parent: BrowserWindow.getFocusedWindow(),
            autoHideMenuBar: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false
        });

        dialogWindow.once('ready-to-show', () => {
            dialogWindow.show();
        });

        dialogWindow.loadFile(path.join(__dirname, '../renderer/connection-dialog.html'));

        dialogWindow.on('closed', () => {
            resolve();
        });
    });
}

function setupMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Connection',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => showConnectionDialog()
                },
                {
                    label: 'Close Window',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => {
                        const focusedWindow = BrowserWindow.getFocusedWindow();
                        if (focusedWindow) {
                            focusedWindow.close();
                        }
                    }
                },
                { type: 'separator' },
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectall' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                {
                    label: 'Theme',
                    submenu: [
                        {
                            label: 'System',
                            click: (item, focusedWindow) => {
                                if (focusedWindow) focusedWindow.webContents.send('theme:set', 'system');
                            }
                        },
                        {
                            label: 'Light',
                            click: (item, focusedWindow) => {
                                if (focusedWindow) focusedWindow.webContents.send('theme:set', 'light');
                            }
                        },
                        {
                            label: 'Dark',
                            click: (item, focusedWindow) => {
                                if (focusedWindow) focusedWindow.webContents.send('theme:set', 'dark');
                            }
                        }
                    ]
                },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Debug Console',
                    accelerator: 'CmdOrCtrl+Shift+D',
                    click: () => {
                        debugWindow.toggle();
                        debugWindow.flush();
                    }
                },
                { type: 'separator' },
                {
                    label: 'About',
                    click: () => {
                        const aboutWindow = new BrowserWindow({
                            width: 400,
                            height: 300,
                            parent: BrowserWindow.getFocusedWindow(),
                            modal: true,
                            autoHideMenuBar: true,
                            webPreferences: {
                                nodeIntegration: true,
                                contextIsolation: false
                            }
                        });
                        aboutWindow.loadFile(path.join(__dirname, '../renderer/about.html'));
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
