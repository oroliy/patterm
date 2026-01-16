const { ipcRenderer } = require('electron');

let tabs = new Map();
let activeTabId = null;

const newTabBtn = document.getElementById('newTabBtn');
const loggingBtn = document.getElementById('loggingBtn');
const tabsContainer = document.getElementById('tabs');
const tabContent = document.getElementById('tabContent');

async function debugLog(message, level = 'info') {
    try {
        await ipcRenderer.invoke('debug:log', message, level);
    } catch (error) {
        console.error('[Renderer] Failed to log to debug window:', error);
    }
}

async function showConnectionDialog() {
    await debugLog('showConnectionDialog called', 'info');
    try {
        await ipcRenderer.invoke('window:showConnectionDialog');
    } catch (error) {
        await debugLog(`Failed to show connection dialog: ${error.message}`, 'error');
    }
}

function addTab(tabId, tabName, connected) {
    debugLog(`addTab called with tabId=${tabId}, tabName=${tabName}, connected=${connected}`, 'info');

    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabId = tabId;

    const statusIcon = connected ? '●' : '○';
    tab.innerHTML = `
        <span class="tab-status">${statusIcon}</span>
        <span class="tab-title">${tabName}</span>
        <button class="tab-close" data-tab-id="${tabId}">×</button>
    `;

    tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close')) {
            switchTab(tabId);
        }
    });

    tabs.set(tabId, {
        element: tab,
        title: tabName,
        connected: connected
    });

    tabsContainer.appendChild(tab);

    debugLog(`Tab element appended to container, children count: ${tabsContainer.children.length}`, 'info');
    debugLog(`Tab element dimensions: ${tab.offsetWidth}x${tab.offsetHeight}`, 'debug');

    switchTab(tabId);
}

function updateTabStatus(tabId, connected) {
    const tab = tabs.get(tabId);
    if (!tab) return;

    tab.connected = connected;
    const statusIcon = connected ? '●' : '○';
    const statusElement = tab.element.querySelector('.tab-status');
    if (statusElement) {
        statusElement.textContent = statusIcon;
        statusElement.style.color = connected ? '#4caf50' : '#999';
    }
}

async function closeTab(tabId) {
    try {
        await ipcRenderer.invoke('window:closeTab', tabId);
        const tab = tabs.get(tabId);
        if (tab) {
            tab.element.remove();
            tabs.delete(tabId);

            if (activeTabId === tabId) {
                const remainingTabs = Array.from(tabs.keys());
                if (remainingTabs.length > 0) {
                    switchTab(remainingTabs[0]);
                } else {
                    activeTabId = null;
                    tabContent.innerHTML = '<div class="empty-state">No connections. Click "New Connection" to start.</div>';
                    loggingBtn.disabled = true;
                }
            }
        }
    } catch (error) {
        console.error('Failed to close tab:', error);
    }
}

function switchTab(tabId) {
    debugLog(`switchTab called with tabId=${tabId}, activeTabId=${activeTabId}`, 'info');

    if (activeTabId === tabId) return;

    const tab = tabs.get(tabId);
    if (!tab) {
        debugLog(`Tab ${tabId} not found in tabs map`, 'warn');
        return;
    }

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.element.classList.add('active');

    ipcRenderer.invoke('window:switchTab', tabId);
    activeTabId = tabId;

    tabContent.innerHTML = '';
    debugLog(`Switched to tab ${tabId}`, 'info');
}

async function startLogging() {
    if (!activeTabId) {
        alert('Please select a tab first');
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `patterm-log-${timestamp}.txt`;

    const filePath = await ipcRenderer.invoke('dialog:saveFile', {
        defaultPath: fileName,
        filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (filePath) {
        try {
            await ipcRenderer.invoke('log:start', activeTabId, filePath, 'continuous');
            loggingBtn.textContent = 'Stop Log';
            loggingBtn.classList.add('btn-warning');
        } catch (error) {
            alert(`Failed to start logging: ${error.message}`);
        }
    }
}

async function stopLogging() {
    if (!activeTabId) return;

    try {
        await ipcRenderer.invoke('log:stop', activeTabId);
        loggingBtn.textContent = 'Log';
        loggingBtn.classList.remove('btn-warning');
    } catch (error) {
        alert(`Failed to stop logging: ${error.message}`);
    }
}

newTabBtn.addEventListener('click', showConnectionDialog);

loggingBtn.addEventListener('click', () => {
    if (loggingBtn.textContent === 'Log') {
        startLogging();
    } else {
        stopLogging();
    }
});

tabsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-close')) {
        const tabId = parseInt(e.target.dataset.tabId);
        debugLog(`Closing tab ${tabId}`, 'info');
        closeTab(tabId);
    }
});

ipcRenderer.on('tab:created', (event, tabData) => {
    debugLog(`tab:created event received: ${JSON.stringify(tabData)}`, 'info');
    addTab(tabData.id, tabData.tabName, tabData.connected);
});

ipcRenderer.on('tab:statusChanged', (event, tabId, connected) => {
    updateTabStatus(tabId, connected);
});

ipcRenderer.on('serial:error', (event, error) => {
    debugLog(`Serial Error: ${error}`, 'error');
});

window.addEventListener('load', () => {
    debugLog('Main window loaded', 'info');
    tabContent.innerHTML = '<div class="empty-state">No connections. Click "New Connection" to start.</div>';
    updateUIState();
});

window.addEventListener('resize', () => {
    ipcRenderer.invoke('window:resize');
});

function updateUIState() {
    if (activeTabId && tabs.get(activeTabId)?.connected) {
        loggingBtn.disabled = false;
    } else {
        loggingBtn.disabled = true;
    }
}
