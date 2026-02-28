const { app, BrowserWindow, ipcMain, Menu, dialog, nativeTheme } = require('electron');
const path = require('path');
const WindowManager = require('./window-manager');
const SerialServiceManager = require('../services/serial-service-manager');
const DebugWindow = require('./debug-window');

let windowManager;
let serialServiceManager;
let debugWindow;
let currentTheme = 'system';
let tabCounter = 0;

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

            const tabId = ++tabCounter;
            debugWindow.log(`Generated tabId: ${tabId}`, 'info');

            const result = await serialServiceManager.openConnection(tabId, config, tabName);
            debugWindow.log(`Serial connection opened: ${JSON.stringify(result)}`, 'info');

            serialServiceManager.onData(tabId, (data) => {
                const mainWindow = windowManager.getMainWindow();
                if (mainWindow) {
                    mainWindow.webContents.send('serial:data', tabId, data);
                }
            });

            serialServiceManager.onError(tabId, (error) => {
                const mainWindow = windowManager.getMainWindow();
                if (mainWindow) {
                    mainWindow.webContents.send('serial:error', tabId, error);
                }
            });

            const mainWindow = windowManager.getMainWindow();
            if (mainWindow) {
                // Not sending tab:created here anymore because the Renderer spawns the tab locally using TabManager!
                // But we send back the tabId via the handle result so IpcSerialProvider knows its ID.
                mainWindow.webContents.send('serial:connected', tabId, true);
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
        return serialServiceManager.closeConnection(tabId);
    });

    ipcMain.handle('serial:write', async (event, tabId, data) => {
        return serialServiceManager.write(tabId, data);
    });

    ipcMain.handle('serial:disconnect', async (event, tabId) => {
        const result = await serialServiceManager.closeConnection(tabId);
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow) {
            mainWindow.webContents.send('serial:connected', tabId, false);
        }
        return result;
    });

    ipcMain.handle('serial:reconnect', async (event, tabId) => {
        const tabData = serialServiceManager.getService(tabId);
        if (!tabData || !tabData.config) {
            throw new Error('No previous connection configuration found');
        }
        const result = await serialServiceManager.openConnection(tabId, tabData.config, tabData.tabName);
        const mainWindow = windowManager.getMainWindow();
        if (mainWindow) {
            mainWindow.webContents.send('serial:connected', tabId, true);
        }
        return result;
    });

    ipcMain.handle('serial:getConfig', async (event, tabId) => {
        return serialServiceManager.getConfig(tabId);
    });

    // We can remove window:newTab, window:switchTab, etc because UI handles it natively

    ipcMain.handle('log:start', async (event, tabId, filePath, mode) => {
        const tabData = serialServiceManager.getService(tabId);
        if (!tabData) throw new Error('Service not found for tab');
        return tabData.service.startLogging(filePath, mode);
    });

    ipcMain.handle('log:stop', async (event, tabId) => {
        const tabData = serialServiceManager.getService(tabId);
        if (!tabData) throw new Error('Service not found for tab');
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
        nativeTheme.themeSource = originalTheme;
        windowManager.broadcastToTabs('theme:update', effectiveTheme);
        return true;
    });

    ipcMain.handle('theme:get', async () => {
        return currentTheme;
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
                    click: () => {
                        const mainWindow = windowManager.getMainWindow();
                        if (mainWindow) mainWindow.webContents.send('menu:new-connection');
                    }
                },
                {
                    label: 'Close Window',
                    accelerator: 'CmdOrCtrl+W',
                    click: () => {
                        const focusedWindow = BrowserWindow.getFocusedWindow();
                        if (focusedWindow) focusedWindow.close();
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
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});