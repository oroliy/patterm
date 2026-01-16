const { ipcRenderer } = require('electron');

let tabs = new Map();
let activeTabId = null;
let isConnected = false;

const portSelect = document.getElementById('portSelect');
const baudRate = document.getElementById('baudRate');
const dataBits = document.getElementById('dataBits');
const stopBits = document.getElementById('stopBits');
const parity = document.getElementById('parity');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const newTabBtn = document.getElementById('newTabBtn');
const refreshPortsBtn = document.getElementById('refreshPortsBtn');
const loggingBtn = document.getElementById('loggingBtn');
const tabsContainer = document.getElementById('tabs');
const tabContent = document.getElementById('tabContent');

async function loadPorts() {
    try {
        const ports = await ipcRenderer.invoke('serial:listPorts');
        portSelect.innerHTML = '<option value="">Select Port...</option>';
        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port.path;
            option.textContent = `${port.path} (${port.manufacturer || 'Unknown'})`;
            portSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load ports:', error);
    }
}

async function connect() {
    const config = {
        path: portSelect.value,
        baudRate: parseInt(baudRate.value),
        dataBits: parseInt(dataBits.value),
        stopBits: parseFloat(stopBits.value),
        parity: parity.value
    };

    if (!config.path) {
        alert('Please select a port');
        return;
    }

    try {
        await ipcRenderer.invoke('serial:open', config);
        isConnected = true;
        updateUIState();
        if (activeTabId) {
            const tab = tabs.get(activeTabId);
            if (tab && tab.view) {
                tab.view.webContents.send('setConnected', true);
            }
        }
    } catch (error) {
        alert(`Failed to connect: ${error.message}`);
    }
}

async function disconnect() {
    try {
        await ipcRenderer.invoke('serial:close');
        isConnected = false;
        updateUIState();
        tabs.forEach(tab => {
            if (tab.view) {
                tab.view.webContents.send('setConnected', false);
            }
        });
    } catch (error) {
        alert(`Failed to disconnect: ${error.message}`);
    }
}

function updateUIState() {
    if (isConnected) {
        connectBtn.style.display = 'none';
        disconnectBtn.style.display = 'inline-block';
        portSelect.disabled = true;
        baudRate.disabled = true;
        dataBits.disabled = true;
        stopBits.disabled = true;
        parity.disabled = true;
        loggingBtn.disabled = false;
    } else {
        connectBtn.style.display = 'inline-block';
        disconnectBtn.style.display = 'none';
        portSelect.disabled = false;
        baudRate.disabled = false;
        dataBits.disabled = false;
        stopBits.disabled = false;
        parity.disabled = false;
        loggingBtn.disabled = true;
    }
}

async function createNewTab() {
    try {
        const result = await ipcRenderer.invoke('window:newTab');
        const tabId = result.id;
        
        const tab = document.createElement('div');
        tab.className = 'tab';
        tab.dataset.tabId = tabId;
        tab.innerHTML = `
            <span class="tab-title">${result.title}</span>
            <button class="tab-close" data-tab-id="${tabId}">×</button>
        `;
        
        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                switchTab(tabId);
            }
        });
        
        tabs.set(tabId, {
            element: tab,
            title: result.title,
            view: null
        });
        
        tabsContainer.appendChild(tab);
        switchTab(tabId);
    } catch (error) {
        alert(`Failed to create tab: ${error.message}`);
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
                    tabContent.innerHTML = '<div class="empty-state">No tabs open. Click "New Tab" to start.</div>';
                }
            }
        }
    } catch (error) {
        console.error('Failed to close tab:', error);
    }
}

function switchTab(tabId) {
    if (activeTabId === tabId) return;
    
    const tab = tabs.get(tabId);
    if (!tab) return;
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.element.classList.add('active');
    
    ipcRenderer.invoke('window:switchTab', tabId);
    activeTabId = tabId;
    
    tabContent.innerHTML = '';
}

async function startLogging() {
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
            await ipcRenderer.invoke('log:start', filePath, 'continuous');
            loggingBtn.textContent = 'Stop Log';
            loggingBtn.classList.add('btn-warning');
            alert('Logging started');
        } catch (error) {
            alert(`Failed to start logging: ${error.message}`);
        }
    }
}

async function stopLogging() {
    try {
        await ipcRenderer.invoke('log:stop');
        loggingBtn.textContent = 'Log';
        loggingBtn.classList.remove('btn-warning');
        alert('Logging stopped');
    } catch (error) {
        alert(`Failed to stop logging: ${error.message}`);
    }
}

connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
newTabBtn.addEventListener('click', createNewTab);
refreshPortsBtn.addEventListener('click', loadPorts);
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
        closeTab(tabId);
    }
});

ipcRenderer.on('serial:data', (event, data) => {
    tabs.forEach(tab => {
        if (tab.view) {
            tab.view.webContents.send('receivedData', data);
        }
    });
});

ipcRenderer.on('serial:error', (event, error) => {
    alert(`Serial Error: ${error}`);
});

ipcRenderer.on('tab:viewReady', (event, tabId) => {
    const tab = tabs.get(tabId);
    if (tab) {
        tab.view = event.sender;
        if (isConnected) {
            tab.view.webContents.send('setConnected', true);
        }
    }
});

window.addEventListener('load', () => {
    loadPorts();
    updateUIState();
    tabContent.innerHTML = '<div class="empty-state">No tabs open. Click "New Tab" to start.</div>';
});

window.addEventListener('resize', () => {
    ipcRenderer.invoke('window:resize');
});
