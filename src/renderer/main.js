const { ipcRenderer } = require('electron');

let tabs = new Map();
let activeTabId = null;

let newTabBtn, loggingBtn, disconnectBtn, scrollBtn, tabsContainer, tabContent;

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

async function addTab(tabId, tabName, connected, shouldActivate = false) {
    debugLog(`addTab called with tabId=${tabId}, tabName=${tabName}, connected=${connected}, shouldActivate=${shouldActivate}`, 'info');

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

    await ipcRenderer.invoke('window:recalcLayout');

    if (shouldActivate) {
        switchTab(tabId);
    }
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
        const tab = tabs.get(tabId);
        if (tab && tab.connected) {
            const confirmed = confirm('The connection is still active. Do you want to close this tab and disconnect?');
            if (!confirmed) {
                return;
            }
        }

        await ipcRenderer.invoke('window:closeTab', tabId);
        if (tab) {
            tab.element.remove();
            tabs.delete(tabId);

            if (activeTabId === tabId) {
                const remainingTabs = Array.from(tabs.keys());
                if (remainingTabs.length > 0) {
                    switchTab(remainingTabs[0]);
                } else {
                    activeTabId = null;
                    tabContent.innerHTML = `
                        <div class="empty-state">
                            <div style="text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.2">⚡</div>
                                <p>Create a new connection to start</p>
                            </div>
                        </div>
                    `;
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

// Initialize DOM elements and event listeners
document.addEventListener('DOMContentLoaded', () => {
    newTabBtn = document.getElementById('new-connection-btn');
    loggingBtn = document.getElementById('log-btn');
    disconnectBtn = document.getElementById('disconnect-btn');
    scrollBtn = document.getElementById('auto-scroll-btn');
    tabsContainer = document.getElementById('tabs-container');
    tabContent = document.getElementById('tab-content');

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

    // Initialize UI
    tabContent.innerHTML = `
        <div class="empty-state">
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px; opacity: 0.2">⚡</div>
                <p>Create a new connection to start</p>
            </div>
        </div>
    `;
    updateUIState();
});

ipcRenderer.on('tab:created', (event, tabData) => {
    debugLog(`tab:created event received: ${JSON.stringify(tabData)}`, 'info');
    addTab(tabData.id, tabData.tabName, tabData.connected, tabData.shouldActivate);
});

ipcRenderer.on('tab:statusChanged', (event, tabId, connected) => {
    updateTabStatus(tabId, connected);
    if (tabId === activeTabId) {
        updateUIState();
        updateStatusBar();
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
    startTimeTimer();
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

const mainStatusIndicator = document.getElementById('main-status-indicator');
const mainPortName = document.getElementById('main-port-name');
const mainDuration = document.getElementById('main-duration');
const mainCreatedTime = document.getElementById('main-created-time');
const mainCurrentTime = document.getElementById('main-current-time');
const mainRxRate = document.getElementById('main-rx-rate');
const mainTxRate = document.getElementById('main-tx-rate');
const mainRxBadge = document.getElementById('main-rx-badge');
const mainTxBadge = document.getElementById('main-tx-badge');

let tabCreatedTimes = new Map();
let tabConnectionStartTimes = new Map();
let tabRxRates = new Map();
let tabTxRates = new Map();
let tabPortInfo = new Map();

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDuration(startTime) {
    const now = Date.now();
    const diff = Math.floor((now - startTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateCurrentTime() {
    mainCurrentTime.textContent = formatTime(new Date());
}

function startTimeTimer() {
    setInterval(updateCurrentTime, 1000);
    updateCurrentTime();
}

function updateStatusBar() {
    if (!activeTabId) {
        mainStatusIndicator.className = 'status-indicator-mini disconnected';
        mainPortName.textContent = 'Not Connected';
        mainDuration.textContent = '--:--:--';
        mainCreatedTime.textContent = '--:--:--';
        mainRxRate.textContent = '0 B/s';
        mainTxRate.textContent = '0 B/s';
        return;
    }

    const tab = tabs.get(activeTabId);
    if (!tab) return;

    const connected = tab.connected || false;
    mainStatusIndicator.className = `status-indicator-mini ${connected ? 'connected' : 'disconnected'}`;

    const portInfo = tabPortInfo.get(activeTabId);
    if (portInfo) {
        mainPortName.textContent = `${portInfo.path} @ ${portInfo.baudRate || 115200}`;
    }

    if (connected && tabConnectionStartTimes.has(activeTabId)) {
        mainDuration.textContent = formatDuration(tabConnectionStartTimes.get(activeTabId));
    } else {
        mainDuration.textContent = '--:--:--';
    }

    if (tabCreatedTimes.has(activeTabId)) {
        mainCreatedTime.textContent = formatTime(tabCreatedTimes.get(activeTabId));
    }

    mainRxRate.textContent = formatRate(tabRxRates.get(activeTabId) || 0);
    mainTxRate.textContent = formatRate(tabTxRates.get(activeTabId) || 0);
}

function formatRate(bytesPerSecond) {
    if (bytesPerSecond === 0) return '0 B/s';
    if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

function triggerRxPulse() {
    mainRxBadge.classList.add('active');
    setTimeout(() => mainRxBadge.classList.remove('active'), 200);
}

function triggerTxPulse() {
    mainTxBadge.classList.add('active');
    setTimeout(() => mainTxBadge.classList.remove('active'), 200);
}

ipcRenderer.on('tab:created', (event, tabData) => {
    debugLog(`tab:created event received: ${JSON.stringify(tabData)}`, 'info');
    tabCreatedTimes.set(tabData.id, new Date());
    addTab(tabData.id, tabData.tabName, tabData.connected, tabData.shouldActivate);
});

ipcRenderer.on('tab:updateRates', (event, tabId, rxRate, txRate) => {
    tabRxRates.set(tabId, rxRate);
    tabTxRates.set(tabId, txRate);
    if (tabId === activeTabId) {
        mainRxRate.textContent = formatRate(rxRate);
        mainTxRate.textContent = formatRate(txRate);
    }
});

ipcRenderer.on('tab:rxActivity', (event, tabId) => {
    if (tabId === activeTabId) {
        triggerRxPulse();
    }
});

ipcRenderer.on('tab:txActivity', (event, tabId) => {
    if (tabId === activeTabId) {
        triggerTxPulse();
    }
});

ipcRenderer.on('serial:portInfo', (event, tabId, portInfo) => {
    tabPortInfo.set(tabId, portInfo);
    if (tabId === activeTabId) {
        mainPortName.textContent = `${portInfo.path} @ ${portInfo.baudRate || 115200}`;
    }
});

ipcRenderer.on('serial:connected', (event, tabId, connected) => {
    if (connected) {
        tabConnectionStartTimes.set(tabId, Date.now());
    } else {
        tabConnectionStartTimes.delete(tabId);
    }
    if (tabId === activeTabId) {
        updateStatusBar();
    }
});

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
    updateStatusBar();
    debugLog(`Switched to tab ${tabId}`, 'info');
}
