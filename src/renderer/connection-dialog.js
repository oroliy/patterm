const { ipcRenderer } = require('electron');

// Initialize theme
ipcRenderer.invoke('theme:get').then(originalTheme => {
    const systemDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
    let effectiveTheme = originalTheme;
    if (originalTheme === 'system') {
        effectiveTheme = systemDarkMode.matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effectiveTheme);
});

ipcRenderer.on('theme:update', (event, effectiveTheme) => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
});

const tabNameInput = document.getElementById('tabName');
const portInput = document.getElementById('portInput');
const portList = document.getElementById('portList');
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
const generalError = document.getElementById('generalError');
const generalErrorText = document.getElementById('generalErrorText');
const generalErrorClose = document.getElementById('generalErrorClose');

async function loadPorts() {
    hideError();
    try {
        const ports = await ipcRenderer.invoke('serial:listPorts');
        portList.innerHTML = '';
        ports.forEach(port => {
            const option = document.createElement('option');
            option.value = port.path;
            option.label = `${port.path} (${port.manufacturer || 'Unknown'})`;
            portList.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load ports:', error);
        showError('Failed to load ports');
    }
}

function showError(message) {
    generalErrorText.textContent = message;
    generalError.classList.add('show');
}

function hideError() {
    generalError.classList.remove('show');
    generalErrorText.textContent = '';
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

    if (!portInput.value.trim()) {
        portError.classList.add('show');
        isValid = false;
    }

    return isValid;
}

async function handleConnect() {
    hideError();
    if (!validateForm()) {
        return;
    }

    const config = {
        path: portInput.value.trim(),
        baudRate: parseInt(baudRate.value),
        dataBits: parseInt(dataBits.value),
        stopBits: parseFloat(stopBits.value),
        parity: parity.value
    };

    const tabName = tabNameInput.value.trim() || portInput.value.trim();

    showLoading();

    try {
        const result = await ipcRenderer.invoke('connection:create', config, tabName);

        if (result.success) {
            window.close();
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
    window.close();
}

refreshPortsBtn.addEventListener('click', async () => {
    showLoading();
    await loadPorts();
    hideLoading();
});

generalErrorClose.addEventListener('click', hideError);

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
