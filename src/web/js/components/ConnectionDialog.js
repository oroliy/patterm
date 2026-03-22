import { DEFAULT_SERIAL_CONFIG, BAUD_RATES, DATA_BITS, STOP_BITS, PARITY_OPTIONS, FLOW_CONTROL_OPTIONS } from '../utils/constants.js';
import { debug } from '../utils/debug.js';

export class ConnectionDialog {
    constructor(options = {}) {
        this.onConnect = options.onConnect || (() => {});
        this.onCancel = options.onCancel || (() => {});
        this.dialog = null;
        this.overlay = null;
        this.selectedPort = null;
    }

    show() {
        return new Promise((resolve) => {
            this.createDialog();
            this.onConnect = (config, tabName, port) => {
                this.hide();
                resolve({ confirmed: true, config, tabName, port });
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
        this.afterDialogCreated();
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
                            ${this.getPortSelectionMarkup()}
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

    getPortSelectionMarkup() {
        return `
            <div class="port-selector">
                <button type="button" id="select-port-btn" class="btn btn-primary">
                    <span class="btn-icon">🔌</span>
                    Select Port
                </button>
                <span id="selected-port-info" class="selected-port-info"></span>
            </div>
            <p class="form-hint">Click "Select Port" to choose a serial device from the browser</p>
        `;
    }

    attachEventListeners() {
        debug.log('[ConnectionDialog] attachEventListeners called');
        const closeBtn = this.dialog.querySelector('.dialog-close-btn');
        const cancelBtn = this.dialog.querySelector('#cancel-btn');
        const connectBtn = this.dialog.querySelector('#connect-btn');
        const overlay = this.overlay;

        debug.log('[ConnectionDialog] Elements found:', {
            closeBtn: !!closeBtn,
            cancelBtn: !!cancelBtn,
            connectBtn: !!connectBtn
        });

        closeBtn.addEventListener('click', () => {
            debug.log('[ConnectionDialog] Close button clicked');
            this.onCancel();
        });

        cancelBtn.addEventListener('click', () => {
            debug.log('[ConnectionDialog] Cancel button clicked');
            this.onCancel();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                debug.log('[ConnectionDialog] Overlay clicked (outside dialog)');
                this.onCancel();
            }
        });

        this.dialog.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        connectBtn.addEventListener('click', () => {
            debug.log('[ConnectionDialog] Connect button clicked, calling handleConnect');
            debug.log('[ConnectionDialog] selectedPort:', this.selectedPort);
            this.handleConnect();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                debug.log('[ConnectionDialog] Escape pressed, cancelling');
                this.onCancel();
            }
        });

        this.attachPortEventListeners();
    }

    attachPortEventListeners() {
        const selectPortBtn = this.dialog.querySelector('#select-port-btn');
        if (!selectPortBtn) {
            return;
        }

        selectPortBtn.addEventListener('click', () => {
            debug.log('[ConnectionDialog] Select Port button clicked');
            this.selectPort();
        });
    }

    afterDialogCreated() {
        this.preSelectFirstPort();
    }

    async selectPort() {
        try {
            const port = await navigator.serial.requestPort();
            this.selectedPort = port;

            const info = port.getInfo();
            const infoText = this.formatPortInfo(info);
            const infoSpan = this.dialog.querySelector('#selected-port-info');
            infoSpan.textContent = infoText;
            infoSpan.classList.add('port-selected');

            const tabNameInput = this.dialog.querySelector('#tab-name');
            if (tabNameInput && !tabNameInput.value.trim()) {
                tabNameInput.value = this.getDefaultTabNameFromInfo(info);
            }

            this.setConnectEnabled(true);

            this.clearError();
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.showError(`Failed to select port: ${error.message}`);
            }
        }
    }

    formatPortInfo(info) {
        if (info.usbVendorId && info.usbProductId) {
            const vendorId = info.usbVendorId.toString(16).toUpperCase().padStart(4, '0');
            const productId = info.usbProductId.toString(16).toUpperCase().padStart(4, '0');
            return `Selected: USB VID:PID ${vendorId}:${productId}`;
        }
        return 'Port selected';
    }

    getDefaultTabNameFromInfo(info) {
        if (info.usbVendorId && info.usbProductId) {
            const vendorId = info.usbVendorId.toString(16).toUpperCase().padStart(4, '0');
            const productId = info.usbProductId.toString(16).toUpperCase().padStart(4, '0');
            return `USB VID:PID ${vendorId}:${productId}`;
        }
        return 'Serial Port';
    }

    async handleConnect() {
        debug.log('[ConnectionDialog] handleConnect() called');
        debug.log('[ConnectionDialog] selectedPort:', this.selectedPort);

        if (!this.canConnect()) {
            debug.log('[ConnectionDialog] No port selected, showing error');
            this.showError(this.getMissingSelectionMessage());
            return;
        }

        const config = this.getFormConfig();
        const tabName = this.getTabName(this.getDefaultTabName(config));
        const port = this.getSelectedPort();

        debug.log('[ConnectionDialog] Connecting with:', { config, tabName, port });
        debug.log('[ConnectionDialog] Calling onConnect callback');
        this.onConnect(config, tabName, port);
        debug.log('[ConnectionDialog] onConnect callback completed');
    }

    getFormConfig() {
        return {
            baudRate: parseInt(this.dialog.querySelector('#baud-rate').value),
            dataBits: parseInt(this.dialog.querySelector('#data-bits').value),
            stopBits: parseInt(this.dialog.querySelector('#stop-bits').value),
            parity: this.dialog.querySelector('#parity').value,
            flowControl: this.dialog.querySelector('#flow-control').value
        };
    }

    getTabName(defaultName = null) {
        const input = this.dialog.querySelector('#tab-name');
        return input.value.trim() || defaultName;
    }

    canConnect() {
        return Boolean(this.selectedPort);
    }

    getSelectedPort() {
        return this.selectedPort;
    }

    getMissingSelectionMessage() {
        return 'Please select a serial port first';
    }

    getDefaultTabName() {
        return null;
    }

    setConnectEnabled(enabled) {
        const connectBtn = this.dialog.querySelector('#connect-btn');
        if (connectBtn) {
            connectBtn.disabled = !enabled;
        }
    }

    showError(message) {
        const errorEl = this.dialog.querySelector('#dialog-error');
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }

    clearError() {
        const errorEl = this.dialog.querySelector('#dialog-error');
        errorEl.textContent = '';
        errorEl.style.display = 'none';
    }

    preSelectFirstPort() {
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.dialog = null;
            this.selectedPort = null;
        }
    }
}
