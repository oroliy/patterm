import { TerminalComponent } from './TerminalComponent.js';
import { formatTime, formatDuration, formatBytes, formatRate } from '../utils/helpers.js';
import { debug } from '../utils/debug.js';

export class TabComponent {
    constructor(tabState, options = {}) {
        this.tabState = tabState;
        this.options = options;
        this.element = null;
        this.tabElement = null;
        this.terminal = null;
        this.statusBarElements = {};
        this.transactionFilter = 'all';
    }

    create() {
        debug.log('[TabComponent] Creating component for tab:', this.tabState.id);
        this.createTabElement();
        this.createTabContent();
        this.attachEventListeners();
        this.restoreTerminalState();
        debug.log('[TabComponent] Component created');
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
                <div class="terminal-toolbar">
                    <div class="terminal-search">
                        <input type="search" class="terminal-search-input" placeholder="Search in this tab">
                    </div>
                    <div class="terminal-search-nav">
                        <span class="terminal-search-count" aria-live="polite">0 / 0</span>
                        <button type="button" class="terminal-nav-btn" data-search-nav="prev" aria-label="Previous result">↑</button>
                        <button type="button" class="terminal-nav-btn" data-search-nav="next" aria-label="Next result">↓</button>
                    </div>
                    <div class="terminal-filter-group" role="group" aria-label="Terminal filters">
                        <button type="button" class="terminal-filter-btn active" data-filter-type="all">All</button>
                        <button type="button" class="terminal-filter-btn" data-filter-type="rx">RX</button>
                        <button type="button" class="terminal-filter-btn" data-filter-type="tx">TX</button>
                        <button type="button" class="terminal-filter-btn" data-filter-type="error">Error</button>
                    </div>
                    <button type="button" class="terminal-transaction-btn btn">Blocks</button>
                    <button type="button" class="terminal-workflow-btn btn">Workflows</button>
                    <button type="button" class="terminal-trigger-btn btn">Triggers</button>
                </div>
                <div class="terminal-transaction-panel" hidden>
                    <div class="terminal-transaction-panel-header">
                        <strong>Transactions</strong>
                        <div class="terminal-transaction-filter-group" role="group" aria-label="Transaction filters">
                            <button type="button" class="terminal-transaction-filter-btn active" data-transaction-filter="all">All</button>
                            <button type="button" class="terminal-transaction-filter-btn" data-transaction-filter="failed">Failed</button>
                            <button type="button" class="terminal-transaction-filter-btn" data-transaction-filter="starred">Starred</button>
                        </div>
                        <button type="button" class="terminal-transaction-export-visible-btn">Export Visible</button>
                        <button type="button" class="terminal-transaction-close-btn" aria-label="Close transactions">×</button>
                    </div>
                    <div class="terminal-transaction-empty">No transactions yet</div>
                    <div class="terminal-transaction-list"></div>
                </div>
                <div class="terminal-workflow-panel" hidden>
                    <div class="terminal-workflow-panel-header">
                        <strong>Workflows</strong>
                        <button type="button" class="terminal-workflow-close-btn" aria-label="Close workflows">×</button>
                    </div>
                    <div class="terminal-workflow-runtime">
                        <span class="terminal-workflow-status" data-workflow-status="idle">Idle</span>
                        <span class="terminal-workflow-current-step">No workflow running</span>
                    </div>
                    <div class="terminal-workflow-form">
                        <input type="text" class="terminal-workflow-name-input" placeholder="Workflow name">
                        <input type="text" class="terminal-workflow-send-input" placeholder="Send payload">
                        <input type="text" class="terminal-workflow-wait-input" placeholder="Wait for match">
                        <select class="terminal-workflow-match-type" aria-label="Workflow match type">
                            <option value="contains">Contains</option>
                            <option value="regex">Regex</option>
                        </select>
                        <select class="terminal-workflow-scope" aria-label="Workflow scope">
                            <option value="rx">RX</option>
                            <option value="tx">TX</option>
                            <option value="error">Error</option>
                            <option value="all">All</option>
                        </select>
                        <input type="number" class="terminal-workflow-timeout-input" min="100" step="100" value="2000" placeholder="Timeout ms">
                        <button type="button" class="terminal-workflow-add-btn btn btn-primary">Add</button>
                    </div>
                    <div class="terminal-workflow-empty">No workflows yet</div>
                    <div class="terminal-workflow-list"></div>
                </div>
                <div class="terminal-trigger-panel" hidden>
                    <div class="terminal-trigger-panel-header">
                        <strong>Trigger Rules</strong>
                        <button type="button" class="terminal-trigger-close-btn" aria-label="Close trigger rules">×</button>
                    </div>
                    <div class="terminal-trigger-form">
                        <input type="text" class="terminal-trigger-pattern-input" placeholder="Match text or regex">
                        <select class="terminal-trigger-match-type" aria-label="Trigger match type">
                            <option value="contains">Contains</option>
                            <option value="regex">Regex</option>
                        </select>
                        <select class="terminal-trigger-scope" aria-label="Trigger scope">
                            <option value="all">All</option>
                            <option value="rx">RX</option>
                            <option value="tx">TX</option>
                            <option value="error">Error</option>
                        </select>
                        <select class="terminal-trigger-highlight" aria-label="Trigger highlight">
                            <option value="warning">Warning</option>
                            <option value="success">Success</option>
                            <option value="info">Info</option>
                            <option value="danger">Danger</option>
                        </select>
                        <button type="button" class="terminal-trigger-add-btn btn btn-primary">Add</button>
                    </div>
                    <div class="terminal-trigger-empty">No trigger rules yet</div>
                    <div class="terminal-trigger-list"></div>
                </div>
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
            showTimestamps: true,
            triggerRules: this.tabState.triggerRules,
            saveContent: this.options.saveContent,
            onSearchStateChange: () => this.updateSearchState(),
            onTransactionsChange: (transactions) => this.updateTransactions(transactions)
        });
        this.tabState.terminal = this.terminal;
    }

    updateSearchState() {
        const searchState = this.terminal.getSearchState();
        const searchCount = this.element.querySelector('.terminal-search-count');
        const navButtons = this.element.querySelectorAll('.terminal-nav-btn');
        const hasMatches = searchState.totalMatches > 0;

        if (searchCount) {
            searchCount.textContent = `${searchState.currentMatch} / ${searchState.totalMatches}`;
        }

        navButtons.forEach((button) => {
            button.disabled = !hasMatches;
        });
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
            this.updateSearchState();
            this.options.onClear?.(this.tabState.id);
        });

        const terminalDisplay = this.element.querySelector('.terminal-display');
        terminalDisplay.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.options.onContextMenu?.(this.tabState.id, e);
        });

        const searchInput = this.element.querySelector('.terminal-search-input');
        searchInput.addEventListener('input', (event) => {
            this.terminal.setFilters({ search: event.target.value });
            this.updateSearchState();
            this.options.onFiltersChange?.(this.tabState.id, this.getFilterState());
        });
        searchInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this.terminal.navigateSearchResults(event.shiftKey ? -1 : 1);
                this.updateSearchState();
            }
        });

        const navButtons = this.element.querySelectorAll('.terminal-nav-btn');
        navButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const direction = button.dataset.searchNav === 'prev' ? -1 : 1;
                this.terminal.navigateSearchResults(direction);
                this.updateSearchState();
            });
        });

        const filterButtons = this.element.querySelectorAll('.terminal-filter-btn');
        filterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filterType = button.dataset.filterType;
                filterButtons.forEach((item) => item.classList.toggle('active', item === button));
                this.terminal.setFilters({ type: filterType });
                this.updateSearchState();
                this.options.onFiltersChange?.(this.tabState.id, this.getFilterState());
            });
        });

        const transactionButton = this.element.querySelector('.terminal-transaction-btn');
        transactionButton?.addEventListener('click', () => this.toggleTransactionPanel());

        const transactionFilterButtons = this.element.querySelectorAll('.terminal-transaction-filter-btn');
        transactionFilterButtons.forEach((button) => {
            button.addEventListener('click', () => {
                this.setTransactionFilter(button.dataset.transactionFilter || 'all');
            });
        });

        const exportVisibleButton = this.element.querySelector('.terminal-transaction-export-visible-btn');
        exportVisibleButton?.addEventListener('click', () => this.exportVisibleTransactions());

        const transactionCloseButton = this.element.querySelector('.terminal-transaction-close-btn');
        transactionCloseButton?.addEventListener('click', () => this.toggleTransactionPanel(false));

        const triggerButton = this.element.querySelector('.terminal-trigger-btn');
        triggerButton?.addEventListener('click', () => this.toggleTriggerPanel());

        const triggerCloseButton = this.element.querySelector('.terminal-trigger-close-btn');
        triggerCloseButton?.addEventListener('click', () => this.toggleTriggerPanel(false));

        const triggerAddButton = this.element.querySelector('.terminal-trigger-add-btn');
        triggerAddButton?.addEventListener('click', () => this.addTriggerRuleFromInputs());

        const workflowButton = this.element.querySelector('.terminal-workflow-btn');
        workflowButton?.addEventListener('click', () => this.toggleWorkflowPanel());

        const workflowCloseButton = this.element.querySelector('.terminal-workflow-close-btn');
        workflowCloseButton?.addEventListener('click', () => this.toggleWorkflowPanel(false));

        const workflowAddButton = this.element.querySelector('.terminal-workflow-add-btn');
        workflowAddButton?.addEventListener('click', () => this.addWorkflowFromInputs());
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

    focusSearch() {
        const searchInput = this.element?.querySelector('.terminal-search-input');
        if (!searchInput) {
            return;
        }

        searchInput.focus();
        searchInput.select();
    }

    focusSearchResult(search, type = 'all', entryId = null) {
        const searchInput = this.element?.querySelector('.terminal-search-input');
        const filterButtons = this.element?.querySelectorAll('.terminal-filter-btn') || [];

        if (searchInput) {
            searchInput.value = search || '';
        }

        filterButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.filterType === type);
        });

        if (entryId) {
            this.terminal.focusEntry(entryId, { search, type });
        } else {
            this.terminal.setFilters({ search, type });
        }

        this.updateSearchState();
        this.focusSearch();
    }

    getFilterState() {
        return this.terminal.getFilters();
    }

    getTransactions() {
        return this.tabState.transactions || [];
    }

    toggleTransactionPanel(force = null) {
        const panel = this.element?.querySelector('.terminal-transaction-panel');
        if (!panel) {
            return;
        }

        const shouldShow = force === null ? panel.hidden : force;
        panel.hidden = !shouldShow;
    }

    updateTransactions(transactions = []) {
        this.tabState.transactions = transactions;
        this.renderTransactions();
    }

    setTransactionFilter(filter = 'all') {
        this.transactionFilter = filter;
        const filterButtons = this.element?.querySelectorAll('.terminal-transaction-filter-btn') || [];
        filterButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.transactionFilter === filter);
        });
        this.renderTransactions();
    }

    async copyTransaction(transactionId) {
        try {
            await this.terminal.copyTransaction(transactionId);
            this.terminal.appendInfo('Transaction copied');
        } catch (error) {
            debug.error('Failed to copy transaction:', error);
        }
    }

    async exportTransaction(transactionId) {
        try {
            const exported = await this.terminal.exportTransaction(transactionId);
            if (exported) {
                this.terminal.appendInfo('Transaction exported');
            }
        } catch (error) {
            debug.error('Failed to export transaction:', error);
        }
    }

    toggleTransactionStar(transactionId) {
        const transaction = this.terminal.toggleTransactionStar(transactionId);
        if (!transaction) {
            return;
        }

        this.updateTransactions(this.terminal.getTransactions());
    }

    renameTransaction(transactionId) {
        const transaction = this.getTransactions().find((item) => item.id === transactionId);
        if (!transaction) {
            return;
        }

        const nextSummary = window.prompt?.('Rename transaction', transaction.summary || '');
        if (!nextSummary || !nextSummary.trim()) {
            return;
        }

        const updated = this.terminal.renameTransaction(transactionId, nextSummary);
        if (!updated) {
            return;
        }

        this.updateTransactions(this.terminal.getTransactions());
    }

    getVisibleTransactions() {
        return this.getTransactions().filter((transaction) => this.matchesTransactionFilter(transaction));
    }

    matchesTransactionFilter(transaction) {
        if (this.transactionFilter === 'failed') {
            return (transaction.counts.error || 0) > 0;
        }

        if (this.transactionFilter === 'starred') {
            return Boolean(transaction.starred);
        }

        return true;
    }

    async exportVisibleTransactions() {
        const visibleTransactions = this.getVisibleTransactions();
        if (visibleTransactions.length === 0) {
            return;
        }

        try {
            const exported = await this.terminal.exportTransactions(
                visibleTransactions.map((transaction) => transaction.id)
            );
            if (exported) {
                this.terminal.appendInfo('Visible transactions exported');
            }
        } catch (error) {
            debug.error('Failed to export visible transactions:', error);
        }
    }

    renderTransactions() {
        const list = this.element?.querySelector('.terminal-transaction-list');
        const emptyState = this.element?.querySelector('.terminal-transaction-empty');
        if (!list || !emptyState) {
            return;
        }

        const transactions = this.getVisibleTransactions();
        this.clearListContent(list);
        emptyState.style.display = transactions.length === 0 ? 'block' : 'none';

        transactions
            .slice()
            .reverse()
            .forEach((transaction) => {
                const item = document.createElement('div');
                item.className = 'terminal-transaction-item';
                item.dataset.transactionId = transaction.id;

                const summary = document.createElement('span');
                summary.className = 'terminal-transaction-item-summary';
                summary.textContent = `${transaction.starred ? '★ ' : ''}${transaction.summary || '(empty transaction)'}`;

                const meta = document.createElement('span');
                meta.className = 'terminal-transaction-item-meta';
                meta.textContent = [
                    transaction.type === 'request-response' ? 'REQ/RESP' : 'PASSIVE',
                    `TX ${transaction.counts.tx || 0}`,
                    `RX ${transaction.counts.rx || 0}`,
                    transaction.counts.error ? `ERR ${transaction.counts.error}` : null,
                ].filter(Boolean).join(' · ');

                const failureReason = this.terminal.getTransactionFailureReason(transaction.id);
                const failure = document.createElement('span');
                failure.className = 'terminal-transaction-item-failure';
                failure.textContent = failureReason;
                failure.hidden = !failureReason;

                const actions = document.createElement('div');
                actions.className = 'terminal-transaction-item-actions';

                const starButton = document.createElement('button');
                starButton.type = 'button';
                starButton.className = 'terminal-transaction-star-btn';
                starButton.textContent = transaction.starred ? 'Unstar' : 'Star';
                starButton.addEventListener('click', () => this.toggleTransactionStar(transaction.id));

                const renameButton = document.createElement('button');
                renameButton.type = 'button';
                renameButton.className = 'terminal-transaction-rename-btn';
                renameButton.textContent = 'Rename';
                renameButton.addEventListener('click', () => this.renameTransaction(transaction.id));

                const copyButton = document.createElement('button');
                copyButton.type = 'button';
                copyButton.className = 'terminal-transaction-copy-btn';
                copyButton.textContent = 'Copy';
                copyButton.addEventListener('click', () => this.copyTransaction(transaction.id));

                const exportButton = document.createElement('button');
                exportButton.type = 'button';
                exportButton.className = 'terminal-transaction-export-btn';
                exportButton.textContent = 'Export';
                exportButton.addEventListener('click', () => this.exportTransaction(transaction.id));

                const jumpButton = document.createElement('button');
                jumpButton.type = 'button';
                jumpButton.className = 'terminal-transaction-jump-btn';
                jumpButton.textContent = 'Jump';
                jumpButton.addEventListener('click', () => {
                    this.terminal.focusEntry(transaction.firstEntryId);
                });

                actions.appendChild(starButton);
                actions.appendChild(renameButton);
                actions.appendChild(copyButton);
                actions.appendChild(exportButton);
                actions.appendChild(jumpButton);
                item.appendChild(summary);
                item.appendChild(meta);
                item.appendChild(failure);
                item.appendChild(actions);
                list.appendChild(item);
            });
    }

    getTriggerRules() {
        return this.terminal.getTriggerRules();
    }

    getWorkflows() {
        return this.tabState.workflows || [];
    }

    getWorkflowRuntime() {
        return this.tabState.workflowRuntime || {
            workflowId: null,
            status: 'idle',
            currentStepIndex: -1,
            completedStepIds: [],
            error: null
        };
    }

    toggleWorkflowPanel(force = null) {
        const panel = this.element?.querySelector('.terminal-workflow-panel');
        if (!panel) {
            return;
        }

        const shouldShow = force === null ? panel.hidden : force;
        panel.hidden = !shouldShow;
    }

    addWorkflowFromInputs() {
        const nameInput = this.element?.querySelector('.terminal-workflow-name-input');
        const sendInput = this.element?.querySelector('.terminal-workflow-send-input');
        const waitInput = this.element?.querySelector('.terminal-workflow-wait-input');
        const matchTypeInput = this.element?.querySelector('.terminal-workflow-match-type');
        const scopeInput = this.element?.querySelector('.terminal-workflow-scope');
        const timeoutInput = this.element?.querySelector('.terminal-workflow-timeout-input');

        const payload = sendInput?.value?.trim() || '';
        const pattern = waitInput?.value?.trim() || '';
        if (!payload || !pattern) {
            (payload ? waitInput : sendInput)?.focus?.();
            return;
        }

        const workflows = [
            ...this.getWorkflows(),
            {
                name: nameInput?.value?.trim() || `Workflow ${this.getWorkflows().length + 1}`,
                steps: [
                    {
                        type: 'send',
                        payload
                    },
                    {
                        type: 'waitForMatch',
                        pattern,
                        matchType: matchTypeInput?.value || 'contains',
                        scope: scopeInput?.value || 'rx',
                        timeoutMs: Number.parseInt(timeoutInput?.value || '2000', 10) || 2000
                    }
                ]
            }
        ];

        this.tabState.workflows = workflows;
        this.options.onWorkflowDefinitionsChange?.(this.tabState.id, workflows);
        this.renderWorkflows();

        if (nameInput) {
            nameInput.value = '';
        }
        if (sendInput) {
            sendInput.value = '';
        }
        if (waitInput) {
            waitInput.value = '';
            waitInput.focus();
        }
    }

    removeWorkflow(workflowId) {
        const workflows = this.getWorkflows().filter((workflow) => workflow.id !== workflowId);
        this.tabState.workflows = workflows;
        this.options.onWorkflowDefinitionsChange?.(this.tabState.id, workflows);
        this.renderWorkflows();
    }

    renderWorkflows() {
        const list = this.element?.querySelector('.terminal-workflow-list');
        const emptyState = this.element?.querySelector('.terminal-workflow-empty');
        if (!list || !emptyState) {
            return;
        }

        const workflows = this.getWorkflows();
        this.clearListContent(list);
        emptyState.style.display = workflows.length === 0 ? 'block' : 'none';

        workflows.forEach((workflow) => {
            const item = document.createElement('div');
            item.className = 'terminal-workflow-item';

            const name = document.createElement('span');
            name.className = 'terminal-workflow-item-name';
            name.textContent = workflow.name;

            const summary = document.createElement('span');
            summary.className = 'terminal-workflow-item-summary';
            summary.textContent = workflow.steps.map((step) => {
                if (step.type === 'send') {
                    return `Send "${step.payload}"`;
                }
                return `Wait ${step.pattern}`;
            }).join(' -> ');

            const actions = document.createElement('div');
            actions.className = 'terminal-workflow-item-actions';

            const runButton = document.createElement('button');
            runButton.type = 'button';
            runButton.className = 'terminal-workflow-run-btn';
            runButton.dataset.workflowId = workflow.id;
            runButton.textContent = 'Run';
            runButton.addEventListener('click', () => this.options.onWorkflowRun?.(this.tabState.id, workflow.id));

            const stopButton = document.createElement('button');
            stopButton.type = 'button';
            stopButton.className = 'terminal-workflow-stop-btn';
            stopButton.dataset.workflowId = workflow.id;
            stopButton.textContent = 'Stop';
            stopButton.addEventListener('click', () => this.options.onWorkflowStop?.(this.tabState.id));

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'terminal-workflow-remove-btn';
            removeButton.dataset.workflowId = workflow.id;
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => this.removeWorkflow(workflow.id));

            actions.appendChild(runButton);
            actions.appendChild(stopButton);
            actions.appendChild(removeButton);
            item.appendChild(name);
            item.appendChild(summary);
            item.appendChild(actions);
            list.appendChild(item);
        });
    }

    renderWorkflowRuntime() {
        const runtime = this.getWorkflowRuntime();
        const status = this.element?.querySelector('.terminal-workflow-status');
        const currentStep = this.element?.querySelector('.terminal-workflow-current-step');
        if (!status || !currentStep) {
            return;
        }

        status.dataset.workflowStatus = runtime.status || 'idle';
        status.textContent = String(runtime.status || 'idle').replace(/^\w/, (letter) => letter.toUpperCase());

        const workflow = this.getWorkflows().find((item) => item.id === runtime.workflowId);
        const step = workflow?.steps?.[runtime.currentStepIndex];

        if (runtime.error) {
            currentStep.textContent = runtime.error;
            return;
        }

        if (!workflow) {
            currentStep.textContent = 'No workflow running';
            return;
        }

        if (runtime.status === 'passed') {
            currentStep.textContent = `${workflow.name} complete`;
            return;
        }

        if (runtime.status === 'stopped') {
            currentStep.textContent = runtime.error || `${workflow.name} stopped`;
            return;
        }

        if (!step) {
            currentStep.textContent = `${workflow.name} complete`;
            return;
        }

        currentStep.textContent = step.type === 'send'
            ? `Sending "${step.payload}"`
            : `Waiting for ${step.pattern}`;
    }

    updateWorkflowRuntime(workflowRuntime) {
        this.tabState.workflowRuntime = {
            ...this.getWorkflowRuntime(),
            ...workflowRuntime
        };
        this.renderWorkflowRuntime();
    }

    toggleTriggerPanel(force = null) {
        const panel = this.element?.querySelector('.terminal-trigger-panel');
        if (!panel) {
            return;
        }

        const shouldShow = force === null ? panel.hidden : force;
        panel.hidden = !shouldShow;
    }

    addTriggerRuleFromInputs() {
        const patternInput = this.element?.querySelector('.terminal-trigger-pattern-input');
        const matchTypeInput = this.element?.querySelector('.terminal-trigger-match-type');
        const scopeInput = this.element?.querySelector('.terminal-trigger-scope');
        const highlightInput = this.element?.querySelector('.terminal-trigger-highlight');

        const pattern = patternInput?.value?.trim() || '';
        if (!pattern) {
            patternInput?.focus();
            return;
        }

        const triggerRules = this.terminal.setTriggerRules([
            ...this.getTriggerRules(),
            {
                pattern,
                matchType: matchTypeInput?.value || 'contains',
                scope: scopeInput?.value || 'all',
                highlight: highlightInput?.value || 'warning'
            }
        ]);

        this.tabState.triggerRules = triggerRules;
        this.renderTriggerRules();
        this.options.onTriggerRulesChange?.(this.tabState.id, triggerRules);

        if (patternInput) {
            patternInput.value = '';
            patternInput.focus();
        }
    }

    removeTriggerRule(ruleId) {
        const triggerRules = this.terminal
            .setTriggerRules(this.getTriggerRules().filter((rule) => rule.id !== ruleId));
        this.tabState.triggerRules = triggerRules;
        this.renderTriggerRules();
        this.options.onTriggerRulesChange?.(this.tabState.id, triggerRules);
    }

    renderTriggerRules() {
        const list = this.element?.querySelector('.terminal-trigger-list');
        const emptyState = this.element?.querySelector('.terminal-trigger-empty');
        if (!list || !emptyState) {
            return;
        }

        const triggerRules = this.getTriggerRules();
        this.clearListContent(list);
        emptyState.style.display = triggerRules.length === 0 ? 'block' : 'none';

        triggerRules.forEach((rule) => {
            const item = document.createElement('div');
            item.className = 'terminal-trigger-item';

            const name = document.createElement('span');
            name.className = 'terminal-trigger-item-name';
            name.textContent = rule.name;

            const meta = document.createElement('span');
            meta.className = 'terminal-trigger-item-meta';
            meta.textContent = `${String(rule.scope).toUpperCase()} · ${rule.matchType} · ${rule.highlight}`;

            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'terminal-trigger-remove-btn';
            removeButton.dataset.triggerId = rule.id;
            removeButton.setAttribute('aria-label', 'Remove trigger');
            removeButton.textContent = 'Remove';
            removeButton.addEventListener('click', () => this.removeTriggerRule(rule.id));

            item.appendChild(name);
            item.appendChild(meta);
            item.appendChild(removeButton);
            list.appendChild(item);
        });
    }

    restoreTerminalState() {
        const filterState = this.tabState.filterState || { search: '', type: 'all' };
        const searchInput = this.element.querySelector('.terminal-search-input');
        const filterButtons = this.element.querySelectorAll('.terminal-filter-btn');

        if (searchInput) {
            searchInput.value = filterState.search || '';
        }

        filterButtons.forEach((button) => {
            button.classList.toggle('active', button.dataset.filterType === (filterState.type || 'all'));
        });

        this.terminal.setFilters(filterState);
        this.updateTransactions(this.terminal.getTransactions());
        this.renderWorkflowRuntime();
        this.renderWorkflows();
        this.terminal.setTriggerRules(this.tabState.triggerRules || []);
        this.renderTriggerRules();
        this.updateSearchState();
    }

    clearListContent(list) {
        list.innerHTML = '';
        if (Array.isArray(list.children)) {
            list.children = [];
        }
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
