import { DEFAULT_SERIAL_CONFIG, BAUD_RATES, DATA_BITS, STOP_BITS, PARITY_OPTIONS, FLOW_CONTROL_OPTIONS } from '../web/js/utils/constants.js';

export class ElectronConnectionDialog {
    constructor(options = {}) {
        this.onConnect = options.onConnect || (() => {});
        this.onCancel = options.onCancel || (() => {});
        this.dialog = null;
        this.overlay = null;
        this.ipcRenderer = window.require('electron').ipcRenderer;
    }

    async show() {
        return new Promise((resolve) => {
            this.createDialog();
            this.loadPorts();
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

    createDialog() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'dialog-overlay';
        this.overlay.innerHTML = this.getDialogHTML();

        document.body.appendChild(this.overlay);

        this.dialog = this.overlay.querySelector('.connection-dialog');
        this.attachEventListeners();
    }

    getDialogHTML() {
        return `
            <div class="dialog-overlay">
                <div class="connection-dialog">
                    <div class="dialog-header">
                        <h2>New Serial Connection</h2>
                        <button class="dialog-close-btn" aria-label="Close dialog">×</button>
                    </div>
                    <div class="dialog-body">
                        <div class="form-group">
                            <label for="tab-name">Tab Name (Optional)</label>
                            <input type="text" id="tab-name" class="form-input" placeholder="My Serial Port">
                        </div>

                        <div class="form-group">
                            <label for="port-select">Serial Port</label>
                            <div style="display:flex; gap: 8px;">
                                <select id="port-select" class="form-select" style="flex:1;">
                                    <option value="">Loading ports...</option>
                                </select>
                                <button type="button" id="refresh-ports-btn" class="btn">↻</button>
                            </div>
                        </div>

                        <div class="config-grid">
                            <div class="form-group">
                                <label for="baud-rate">Baud Rate</label>
                                <select id="baud-rate" class="form-select">
                                    ${BAUD_RATES.map(rate => `
                                        <option value="${rate}" ${rate === DEFAULT_SERIAL_CONFIG.baudRate ? 'selected' : ''}>${rate}</option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="data-bits">Data Bits</label>
                                <select id="data-bits" class="form-select">
                                    ${DATA_BITS.map(bits => `
                                        <option value="${bits}" ${bits === DEFAULT_SERIAL_CONFIG.dataBits ? 'selected' : ''}>${bits}</option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="stop-bits">Stop Bits</label>
                                <select id="stop-bits" class="form-select">
                                    ${STOP_BITS.map(bits => `
                                        <option value="${bits}" ${bits === DEFAULT_SERIAL_CONFIG.stopBits ? 'selected' : ''}>${bits}</option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="form-group">
                                <label for="parity">Parity</label>
                                <select id="parity" class="form-select">
                                    ${PARITY_OPTIONS.map(opt => `
                                        <option value="${opt.value}" ${opt.value === DEFAULT_SERIAL_CONFIG.parity ? 'selected' : ''}>${opt.label}</option>
                                    `).join('')}
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="flow-control">Flow Control</label>
                                <select id="flow-control" class="form-select">
                                    ${FLOW_CONTROL_OPTIONS.map(opt => `
                                        <option value="${opt.value}" ${opt.value === DEFAULT_SERIAL_CONFIG.flowControl ? 'selected' : ''}>${opt.label}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>

                        <div id="dialog-error" class="dialog-error" style="display: none;"></div>
                    </div>
                    <div class="dialog-footer">
                        <button type="button" id="cancel-btn" class="btn">Cancel</button>
                        <button type="button" id="connect-btn" class="btn btn-primary" disabled>Connect</button>
                    </div>
                </div>
            </div>
        `;
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
                this.dialog.querySelector('#connect-btn').disabled = true;
                return;
            }

            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.path;
                option.textContent = `${port.path} - ${port.manufacturer || 'Unknown'}`;
                select.appendChild(option);
            });
            this.dialog.querySelector('#connect-btn').disabled = false;
        } catch (error) {
            this.showError('Failed to load ports: ' + error.message);
        }
    }

    attachEventListeners() {
        const closeBtn = this.dialog.querySelector('.dialog-close-btn');
        const cancelBtn = this.dialog.querySelector('#cancel-btn');
        const connectBtn = this.dialog.querySelector('#connect-btn');
        const refreshBtn = this.dialog.querySelector('#refresh-ports-btn');
        const overlay = this.overlay;

        closeBtn.addEventListener('click', () => this.onCancel());
        cancelBtn.addEventListener('click', () => this.onCancel());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.onCancel();
        });
        
        refreshBtn.addEventListener('click', () => this.loadPorts());

        connectBtn.addEventListener('click', () => {
            const select = this.dialog.querySelector('#port-select');
            if (!select.value) {
                this.showError('Please select a port');
                return;
            }
            
            const config = {
                path: select.value,
                baudRate: parseInt(this.dialog.querySelector('#baud-rate').value),
                dataBits: parseInt(this.dialog.querySelector('#data-bits').value),
                stopBits: parseInt(this.dialog.querySelector('#stop-bits').value),
                parity: this.dialog.querySelector('#parity').value,
                flowControl: this.dialog.querySelector('#flow-control').value
            };
            
            const tabNameInput = this.dialog.querySelector('#tab-name');
            const tabName = tabNameInput.value.trim() || config.path;
            
            this.onConnect(config, tabName);
        });
    }

    showError(message) {
        const errorEl = this.dialog.querySelector('#dialog-error');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.dialog = null;
        }
    }
}
