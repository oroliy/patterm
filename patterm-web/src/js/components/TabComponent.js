import { TerminalComponent } from './TerminalComponent.js';
import { formatTime, formatDuration, formatBytes, formatRate } from '../utils/helpers.js';

export class TabComponent {
    constructor(tabState, options = {}) {
        this.tabState = tabState;
        this.options = options;
        this.element = null;
        this.tabElement = null;
        this.terminal = null;
        this.statusBarElements = {};
    }

    create() {
        this.createTabElement();
        this.createTabContent();
        this.attachEventListeners();
        return this;
    }

    createTabElement() {
        this.tabElement = document.createElement('div');
        this.tabElement.className = 'tab';
        this.tabElement.dataset.tabId = this.tabState.id;
        this.tabElement.innerHTML = `
            <span class="tab-status ${this.tabState.connected ? 'connected' : ''}"></span>
            <span class="tab-name">${this.escapeHtml(this.tabState.name)}</span>
            <button class="tab-close-btn" aria-label="Close tab">×</button>
        `;
    }

    createTabContent() {
        this.element = document.createElement('div');
        this.element.className = 'tab-content';
        this.element.dataset.tabId = this.tabState.id;
        this.element.style.display = 'none';

        this.element.innerHTML = `
            <div class="terminal-container">
                <div class="terminal-display"></div>

                <div class="input-bar">
                    <div class="status-dot ${this.tabState.connected ? 'connected' : ''}"></div>
                    <input type="text" class="input-field" placeholder="Type command..." autocomplete="off" ${this.tabState.connected ? '' : 'disabled'}>
                    <button class="send-btn btn btn-primary" ${this.tabState.connected ? '' : 'disabled'}>➤</button>
                    <button class="clear-btn btn">Clear</button>
                </div>

                <div class="tab-status-bar">
                    <div class="status-bar-section">
                        <span class="status-indicator-mini ${this.tabState.connected ? 'connected' : 'disconnected'}"></span>
                        <span class="status-value tab-port-name">${this.tabState.connected ? 'Connected' : 'Not Connected'}</span>
                    </div>
                    <div class="status-bar-section">
                        <span class="status-label">RX:</span>
                        <span class="status-value tab-rx-bytes">0 B</span>
                    </div>
                    <div class="status-bar-section">
                        <span class="status-label">TX:</span>
                        <span class="status-value tab-tx-bytes">0 B</span>
                    </div>
                    <div class="status-bar-section">
                        <span class="status-label">Duration:</span>
                        <span class="status-value tab-duration">--:--:--</span>
                    </div>
                    <div class="status-bar-section">
                        <span class="status-label">Created:</span>
                        <span class="status-value tab-created-time">${formatTime(this.tabState.createdTime)}</span>
                    </div>
                    <div class="status-bar-section">
                        <span class="status-label">Current:</span>
                        <span class="status-value tab-current-time">--:--:--</span>
                    </div>
                    <div class="status-bar-section">
                        <div class="rx-tx-indicator">
                            <span class="rx-badge" id="tab-rx-badge-${this.tabState.id}">
                                <span class="arrow-icon">↓</span>
                                <span class="rate-label tab-rx-rate">0 B/s</span>
                            </span>
                            <span class="tx-badge" id="tab-tx-badge-${this.tabState.id}">
                                <span class="arrow-icon">↑</span>
                                <span class="rate-label tab-tx-rate">0 B/s</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.cacheStatusBarElements();
        this.createTerminal();
    }

    cacheStatusBarElements() {
        this.statusBarElements = {
            portName: this.element.querySelector('.tab-port-name'),
            rxBytes: this.element.querySelector('.tab-rx-bytes'),
            txBytes: this.element.querySelector('.tab-tx-bytes'),
            duration: this.element.querySelector('.tab-duration'),
            createdTime: this.element.querySelector('.tab-created-time'),
            currentTime: this.element.querySelector('.tab-current-time'),
            rxRate: this.element.querySelector('.tab-rx-rate'),
            txRate: this.element.querySelector('.tab-tx-rate'),
            rxBadge: this.element.querySelector('.rx-badge'),
            txBadge: this.element.querySelector('.tx-badge'),
            indicator: this.element.querySelector('.status-indicator-mini'),
            inputStatus: this.element.querySelector('.input-bar .status-dot')
        };
    }

    createTerminal() {
        const terminalContainer = this.element.querySelector('.terminal-display');
        this.terminal = new TerminalComponent(terminalContainer, {
            autoScroll: this.tabState.autoScroll,
            showTimestamps: true
        });
        this.tabState.terminal = this.terminal;
    }

    attachEventListeners() {
        const closeBtn = this.tabElement.querySelector('.tab-close-btn');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.options.onClose?.(this.tabState.id);
        });

        this.tabElement.addEventListener('click', () => {
            this.options.onSwitch?.(this.tabState.id);
        });

        const sendBtn = this.element.querySelector('.send-btn');
        const inputField = this.element.querySelector('.input-field');

        sendBtn.addEventListener('click', () => this.handleSend());
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleSend();
            }
        });

        const clearBtn = this.element.querySelector('.clear-btn');
        clearBtn.addEventListener('click', () => {
            this.terminal.clear();
            this.options.onClear?.(this.tabState.id);
        });

        const terminalDisplay = this.element.querySelector('.terminal-display');
        terminalDisplay.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.options.onContextMenu?.(this.tabState.id, e);
        });
    }

    async handleSend() {
        const inputField = this.element.querySelector('.input-field');
        const data = inputField.value.trim();

        if (!data || !this.tabState.connected) {
            return;
        }

        inputField.value = '';
        this.options.onSend?.(this.tabState.id, data);
    }

    updateConnectionState(connected) {
        this.tabState.connected = connected;

        const statusDot = this.tabElement.querySelector('.tab-status');
        const inputStatus = this.element.querySelector('.input-bar .status-dot');
        const indicator = this.statusBarElements.indicator;
        const sendBtn = this.element.querySelector('.send-btn');
        const inputField = this.element.querySelector('.input-field');

        if (connected) {
            statusDot?.classList.add('connected');
            inputStatus?.classList.add('connected');
            indicator?.classList.add('connected');
            sendBtn.disabled = false;
            inputField.disabled = false;
            this.statusBarElements.portName.textContent = 'Connected';
        } else {
            statusDot?.classList.remove('connected');
            inputStatus?.classList.remove('connected');
            indicator?.classList.remove('connected');
            sendBtn.disabled = true;
            inputField.disabled = true;
            this.statusBarElements.portName.textContent = 'Not Connected';
        }
    }

    updateStatusBar() {
        this.statusBarElements.rxBytes.textContent = formatBytes(this.tabState.rxBytesTotal);
        this.statusBarElements.txBytes.textContent = formatBytes(this.tabState.txBytesTotal);
        this.statusBarElements.rxRate.textContent = formatRate(this.tabState.rxRate);
        this.statusBarElements.txRate.textContent = formatRate(this.tabState.txRate);
        this.statusBarElements.duration.textContent = formatDuration(this.tabState.startTime);
        this.statusBarElements.currentTime.textContent = formatTime(new Date());
    }

    updateRates(rxRate, txRate) {
        this.tabState.rxRate = rxRate;
        this.tabState.txRate = txRate;
        this.statusBarElements.rxRate.textContent = formatRate(rxRate);
        this.statusBarElements.txRate.textContent = formatRate(txRate);
        this.triggerPulse('rx');
        this.triggerPulse('tx');
    }

    triggerPulse(type) {
        const badge = type === 'rx' ? this.statusBarElements.rxBadge : this.statusBarElements.txBadge;
        if (badge) {
            badge.classList.add('active');
            setTimeout(() => badge.classList.remove('active'), 200);
        }
    }

    updatePortName(config) {
        if (config) {
            const parityChar = config.parity === 'none' ? 'N' : config.parity.charAt(0).toUpperCase();
            this.statusBarElements.portName.textContent = `@ ${config.baudRate} ${config.dataBits}${parityChar}${config.stopBits}`;
        }
    }

    setName(name) {
        this.tabState.name = name;
        const nameEl = this.tabElement.querySelector('.tab-name');
        if (nameEl) {
            nameEl.textContent = name;
        }
    }

    setActive(active) {
        if (active) {
            this.tabElement.classList.add('active');
            this.element.style.display = 'block';
        } else {
            this.tabElement.classList.remove('active');
            this.element.style.display = 'none';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        if (this.element) {
            this.element.remove();
        }
        if (this.tabElement) {
            this.tabElement.remove();
        }
    }
}
