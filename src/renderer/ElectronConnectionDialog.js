import { ConnectionDialog } from '../web/js/components/ConnectionDialog.js';

export class ElectronConnectionDialog extends ConnectionDialog {
    constructor(options = {}) {
        super(options);
        this.ipcRenderer = window.require('electron').ipcRenderer;
    }

    async show() {
        return new Promise((resolve) => {
            this.createDialog();
            this.onConnect = (config, tabName) => {
                this.hide();
                resolve({ confirmed: true, config, tabName });
            };
            this.onCancel = () => {
                this.hide();
                resolve({ confirmed: false });
            };
        });
    }

    getPortSelectionMarkup() {
        return `
            <div class="port-selector">
                <select id="port-select" class="form-select" style="flex:1;">
                    <option value="">Loading ports...</option>
                </select>
                <button type="button" id="refresh-ports-btn" class="btn">↻</button>
            </div>
            <p class="form-hint">Refresh the list and choose a local serial device exposed to Electron</p>
        `;
    }

    afterDialogCreated() {
        this.loadPorts();
    }

    attachPortEventListeners() {
        const refreshBtn = this.dialog.querySelector('#refresh-ports-btn');
        const select = this.dialog.querySelector('#port-select');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadPorts());
        }

        if (select) {
            select.addEventListener('change', () => {
                this.clearError();
                this.setConnectEnabled(Boolean(select.value));
            });
        }
    }

    getFormConfig() {
        const config = super.getFormConfig();
        return {
            ...config,
            path: this.dialog.querySelector('#port-select').value
        };
    }

    canConnect() {
        return Boolean(this.dialog?.querySelector('#port-select')?.value);
    }

    getMissingSelectionMessage() {
        return 'Please select a port';
    }

    getDefaultTabName(config) {
        return config.path;
    }

    getSelectedPort() {
        return null;
    }

    async loadPorts() {
        try {
            const ports = await this.ipcRenderer.invoke('serial:listPorts');
            const select = this.dialog.querySelector('#port-select');
            select.innerHTML = '';
            
            if (ports.length === 0) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'No ports found';
                select.appendChild(option);
                this.setConnectEnabled(false);
                return;
            }

            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.path;
                option.textContent = `${port.path} - ${port.manufacturer || 'Unknown'}`;
                select.appendChild(option);
            });

            this.setConnectEnabled(Boolean(select.value));
            this.clearError();
        } catch (error) {
            this.showError('Failed to load ports: ' + error.message);
        }
    }
}
