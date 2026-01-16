const { ipcRenderer, remote } = require('electron');

const tabNameInput = document.getElementById('tabName');
const portSelect = document.getElementById('portSelect');
const baudRate = document.getElementById('baudRate');
const dataBits = document.getElementById('dataBits');
const stopBits = document.getElementById('stopBits');
const parity = document.getElementById('parity');
const refreshPortsBtn = document.getElementById('refreshPortsBtn');
const cancelBtn = document.getElementById('cancelBtn');
const connectBtn = document.getElementById('connectBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const portError = document.getElementById('portError');
const tabNameError = document.getElementById('tabNameError');

let currentWindow = null;

function getCurrentWindow() {
    if (!currentWindow) {
        currentWindow = remote.getCurrentWindow();
    }
    return currentWindow;
}

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
        showError('Failed to load ports');
    }
}

function showError(message) {
    alert(message);
}

function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function validateForm() {
    portError.classList.remove('show');
    tabNameError.classList.remove('show');
    let isValid = true;

    if (!portSelect.value) {
        portError.classList.add('show');
        isValid = false;
    }

    return isValid;
}

async function handleConnect() {
    if (!validateForm()) {
        return;
    }

    const config = {
        path: portSelect.value,
        baudRate: parseInt(baudRate.value),
        dataBits: parseInt(dataBits.value),
        stopBits: parseFloat(stopBits.value),
        parity: parity.value
    };

    const tabName = tabNameInput.value.trim() || portSelect.value;

    showLoading();

    try {
        const result = await ipcRenderer.invoke('connection:create', config, tabName);

        if (result.success) {
            getCurrentWindow().close();
        } else {
            hideLoading();
            showError(`Failed to connect: ${result.error || 'Unknown error'}`);
        }
    } catch (error) {
        hideLoading();
        showError(`Failed to connect: ${error.message}`);
    }
}

function handleCancel() {
    getCurrentWindow().close();
}

refreshPortsBtn.addEventListener('click', async () => {
    showLoading();
    await loadPorts();
    hideLoading();
});

cancelBtn.addEventListener('click', handleCancel);
connectBtn.addEventListener('click', handleConnect);

window.addEventListener('load', () => {
    loadPorts();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        handleCancel();
    }
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        handleConnect();
    }
});
