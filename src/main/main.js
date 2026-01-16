const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const WindowManager = require('./window-manager');
const SerialService = require('../services/serial-service');

let windowManager;
let serialService;

function createWindow() {
    windowManager = new WindowManager();
    serialService = new SerialService();

    const mainWindow = windowManager.createMainWindow();
    
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    
    mainWindow.on('closed', () => {
        windowManager.closeAll();
    });

    setupIpcHandlers();
    setupMenu();
}

function setupIpcHandlers() {
    ipcMain.handle('serial:listPorts', async () => {
        return serialService.listPorts();
    });

    ipcMain.handle('serial:open', async (event, config) => {
        return serialService.open(config);
    });

    ipcMain.handle('serial:close', async () => {
        return serialService.close();
    });

    ipcMain.handle('serial:write', async (event, data) => {
        return serialService.write(data);
    });

    ipcMain.handle('serial:setConfig', async (event, config) => {
        return serialService.setConfig(config);
    });

    ipcMain.handle('serial:getConfig', async () => {
        return serialService.getConfig();
    });

    ipcMain.on('serial:data', (event, callbackId) => {
        serialService.on('data', (data) => {
            event.reply('serial:data:' + callbackId, data);
        });
    });

    ipcMain.on('serial:error', (event, callbackId) => {
        serialService.on('error', (error) => {
            event.reply('serial:error:' + callbackId, error);
        });
    });

    ipcMain.handle('window:newTab', async () => {
        return windowManager.createNewTab();
    });

    ipcMain.handle('window:closeTab', async (event, tabId) => {
        return windowManager.closeTab(tabId);
    });

    ipcMain.handle('window:switchTab', async (event, tabId) => {
        return windowManager.switchTab(tabId);
    });

    ipcMain.handle('log:start', async (event, filePath, mode) => {
        return serialService.startLogging(filePath, mode);
    });

    ipcMain.handle('log:stop', async () => {
        return serialService.stopLogging();
    });

    ipcMain.handle('app:getVersion', async () => {
        return app.getVersion();
    });
}

function setupMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Window',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => windowManager.createNewTab()
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
