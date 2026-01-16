const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const WindowManager = require('./window-manager');
const SerialServiceManager = require('../services/serial-service-manager');

let windowManager;
let serialServiceManager;

function createWindow() {
    windowManager = new WindowManager();
    serialServiceManager = new SerialServiceManager();

    const mainWindow = windowManager.createMainWindow();

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.on('closed', () => {
        windowManager.closeAll();
        serialServiceManager.closeAll();
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
            const tabId = ++windowManager.tabCounter;
            const result = await serialServiceManager.openConnection(tabId, config, tabName);

            const tab = windowManager.createNewTab(tabId, result.tabName);

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
            if (tabInfo && tabInfo.view) {
                tabInfo.view.webContents.send('serial:connected', true);
            }

            const mainWindow = BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                mainWindow.webContents.send('tab:created', {
                    id: tabId,
                    tabName: result.tabName,
                    connected: true
                });
            }

            return {
                success: true,
                tabId: tabId,
                tabInfo: result
            };
        } catch (error) {
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

    ipcMain.handle('serial:getConfig', async (event, tabId) => {
        return serialServiceManager.getConfig(tabId);
    });

    ipcMain.handle('window:newTab', async (event, tabId, title) => {
        return windowManager.createNewTab(tabId, title);
    });

    ipcMain.handle('window:closeTab', async (event, tabId) => {
        const result = windowManager.closeTab(tabId);
        await serialServiceManager.closeConnection(tabId);
        return result;
    });

    ipcMain.handle('window:switchTab', async (event, tabId) => {
        return windowManager.switchTab(tabId);
    });

    ipcMain.handle('window:resize', async () => {
        return windowManager.resize();
    });

    ipcMain.handle('window:showConnectionDialog', async () => {
        return showConnectionDialog();
    });

    ipcMain.handle('window:updateTabTitle', async (event, tabId, title) => {
        serialServiceManager.updateTabName(tabId, title);
        return windowManager.updateTabTitle(tabId, title);
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
