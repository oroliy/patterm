const { ipcRenderer } = require('electron');

let tabs = new Map();
let activeTabId = null;

const newTabBtn = document.getElementById('new-connection-btn');
const loggingBtn = document.getElementById('log-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const scrollBtn = document.getElementById('auto-scroll-btn');
const tabsContainer = document.getElementById('tabs-container');
const tabContent = document.getElementById('tab-content');

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
    const statusColor = connected ? '#4caf50' : '#999';
    tab.innerHTML = `
        <span class="tab-status" style="color: ${statusColor}">${statusIcon}</span>
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
                    tabContent.classList.remove('has-active-tab');
                    loggingBtn.disabled = true;
                    updateUIState();
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
    tabContent.classList.add('has-active-tab');
    updateUIState();
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

disconnectBtn.addEventListener('click', async () => {
    if (!activeTabId) return;
    try {
        const tab = tabs.get(activeTabId);
        if (tab && tab.connected) {
            await ipcRenderer.invoke('serial:disconnect', activeTabId);
        } else {
            await ipcRenderer.invoke('serial:reconnect', activeTabId);
        }
    } catch (error) {
        debugLog(`Disconnect/reconnect failed: ${error.message}`, 'error');
    }
});

scrollBtn.addEventListener('click', async () => {
    if (!activeTabId) return;
    try {
        await ipcRenderer.invoke('tab:toggleScroll', activeTabId);
    } catch (error) {
        debugLog(`Toggle scroll failed: ${error.message}`, 'error');
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
    if (tabId === activeTabId) {
        updateUIState();
    }
});

ipcRenderer.on('tab:scrollStateChanged', (event, tabId, autoScroll) => {
    if (tabId === activeTabId) {
        scrollBtn.textContent = autoScroll ? 'Auto Scroll' : 'Hold Scroll';
        if (autoScroll) {
            scrollBtn.classList.add('btn-success');
            scrollBtn.classList.remove('btn-secondary');
        } else {
            scrollBtn.classList.remove('btn-success');
            scrollBtn.classList.add('btn-secondary');
        }
    }
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
    const tab = activeTabId ? tabs.get(activeTabId) : null;
    const connected = tab?.connected || false;

    loggingBtn.disabled = !connected;
    disconnectBtn.disabled = !activeTabId;
    scrollBtn.disabled = !activeTabId;

    if (activeTabId && connected) {
        disconnectBtn.textContent = 'Disconnect';
        disconnectBtn.classList.remove('btn-success');
        disconnectBtn.classList.add('btn-danger');
    } else if (activeTabId) {
        disconnectBtn.textContent = 'Reconnect';
        disconnectBtn.classList.remove('btn-danger');
        disconnectBtn.classList.add('btn-success');
    }
}
