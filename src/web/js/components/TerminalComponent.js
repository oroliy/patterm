import { formatTimestamp, formatBytes, isScrolledToBottom, scrollToBottom } from '../utils/helpers.js';
import { MAX_TERMINAL_LINES } from '../utils/constants.js';
import {
    createTerminalEntry,
    filterTerminalEntries,
    findTerminalEntryMatchRanges,
    normalizeTerminalEntryText
} from '../../../shared/js/terminal/terminalEntries.js';
import { findMatchingTriggerRules, normalizeTriggerRules } from '../../../shared/js/terminal/triggerRules.js';

export class TerminalComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.terminal = container;
        this.onSearchStateChange = options.onSearchStateChange || null;
        this.autoScroll = options.autoScroll ?? true;
        this.showTimestamps = options.showTimestamps ?? true;
        this.lastLogLine = null;
        this.lineCount = 0;
        this.maxLines = options.maxLines ?? MAX_TERMINAL_LINES;
        this.dataBuffers = new Map();
        this.entries = [];
        this.visibleEntries = [];
        this.triggerRules = normalizeTriggerRules(options.triggerRules);
        this.filters = {
            search: '',
            type: 'all'
        };
        this.currentMatchIndex = 0;
        this.lastRenderMeta = {
            totalMatches: 0,
            currentMatch: 0
        };
    }

    appendData(data, type = 'rx') {
        const normalizedText = this.normalizeNewlines(this.normalizeData(data));
        return this.processBufferedData(normalizedText, type);
    }

    normalizeData(data) {
        return normalizeTerminalEntryText(data);
    }

    normalizeNewlines(text) {
        return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    processBufferedData(text, type) {
        const currentBuffer = this.dataBuffers.get(type) || '';
        const combinedText = currentBuffer + text;
        const parts = combinedText.split('\n');
        this.dataBuffers.set(type, parts.pop() || '');
        const appendedEntries = [];

        parts.forEach((part) => {
            const entry = this.appendLine(part, type, true);
            if (entry) {
                appendedEntries.push(entry);
            }
        });

        return appendedEntries;
    }

    appendLine(text, type, hasNewline = true) {
        const entry = createTerminalEntry({
            text,
            type,
            timestamp: new Date()
        });
        entry.triggerMatches = findMatchingTriggerRules(entry, this.triggerRules);

        this.entries.push(entry);
        if (this.entries.length > this.maxLines) {
            this.entries.splice(0, this.entries.length - this.maxLines);
        }

        if (this.hasActiveFilters()) {
            this.renderEntries();
            return entry;
        }

        this.appendEntry(entry, hasNewline, false);
        return entry;
    }

    appendEntry(entry, hasNewline = true, isCurrentMatch = false) {
        if (this.lineCount >= this.maxLines) {
            this.pruneOldLines();
        }

        const line = this.createLineElement(entry.type);
        line.dataset.entryId = entry.id;
        line.classList.toggle('terminal-search-current', isCurrentMatch);
        this.applyTriggerClasses(line, entry);

        if (this.lastLogLine && this.canAppendToLastLine(entry.type)) {
            const textNode = document.createTextNode(entry.text);
            this.lastLogLine.appendChild(textNode);
        } else if (entry.text.length > 0 || hasNewline) {
            if (this.showTimestamps) {
                const tsSpan = this.createTimestampSpan(entry.timestamp);
                line.appendChild(tsSpan);
            }
            this.appendTriggerBadges(line, entry);
            this.appendEntryText(line, entry, isCurrentMatch);
            this.terminal.appendChild(line);
            this.lastLogLine = line;
            this.lineCount++;
        }

        if (hasNewline) {
            this.lastLogLine = null;
        }

        this.maybeScrollToBottom();
    }

    appendEntryText(line, entry, isCurrentMatch) {
        const matchRanges = this.getEntryMatchRanges(entry);

        if (matchRanges.length === 0) {
            line.appendChild(document.createTextNode(entry.text));
            return;
        }

        let cursor = 0;
        matchRanges.forEach((range) => {
            if (range.start > cursor) {
                line.appendChild(document.createTextNode(entry.text.slice(cursor, range.start)));
            }

            const match = document.createElement('mark');
            match.className = 'terminal-search-match';
            if (isCurrentMatch) {
                match.classList.add('current');
            }
            match.textContent = entry.text.slice(range.start, range.end);
            line.appendChild(match);
            cursor = range.end;
        });

        if (cursor < entry.text.length) {
            line.appendChild(document.createTextNode(entry.text.slice(cursor)));
        }
    }

    getEntryMatchRanges(entry) {
        return findTerminalEntryMatchRanges(entry.text, this.filters.search);
    }

    createLineElement(type) {
        const line = document.createElement('div');
        line.className = `${type}-data`;
        return line;
    }

    applyTriggerClasses(line, entry) {
        if (!Array.isArray(entry.triggerMatches) || entry.triggerMatches.length === 0) {
            return;
        }

        line.classList.add('terminal-trigger-hit');
        entry.triggerMatches.forEach((match) => {
            line.classList.add(`terminal-trigger-${match.highlight}`);
        });
    }

    appendTriggerBadges(line, entry) {
        if (!Array.isArray(entry.triggerMatches) || entry.triggerMatches.length === 0) {
            return;
        }

        entry.triggerMatches.forEach((match) => {
            const badge = document.createElement('span');
            badge.className = `terminal-trigger-badge terminal-trigger-badge-${match.highlight}`;
            badge.textContent = match.name;
            line.appendChild(badge);
        });
    }

    canAppendToLastLine(type) {
        return this.lastLogLine && this.lastLogLine.classList.contains(type + '-data');
    }

    createTimestampSpan(timestamp = new Date()) {
        const tsSpan = document.createElement('span');
        tsSpan.className = 'timestamp';
        tsSpan.textContent = formatTimestamp(timestamp);
        return tsSpan;
    }

    pruneOldLines() {
        const linesToRemove = Math.floor(this.maxLines * 0.1);
        for (let i = 0; i < linesToRemove; i++) {
            if (this.terminal.firstChild) {
                this.terminal.removeChild(this.terminal.firstChild);
                this.lineCount--;
            }
        }
    }

    maybeScrollToBottom() {
        if (this.autoScroll) {
            scrollToBottom(this.terminal);
        }
    }

    appendText(text) {
        return this.appendData(text, 'rx');
    }

    appendTransmitted(data) {
        const text = this.normalizeData(data);
        return this.appendLine(`> ${text}`, 'tx', true);
    }

    appendError(error) {
        const text = error instanceof Error ? error.message : String(error);
        return this.appendLine(`Error: ${text}`, 'error');
    }

    appendInfo(message) {
        return this.appendLine(`[INFO] ${message}`, 'info');
    }

    clear() {
        this.terminal.innerHTML = '';
        this.lastLogLine = null;
        this.lineCount = 0;
        this.dataBuffers.clear();
        this.entries = [];
        this.visibleEntries = [];
        this.currentMatchIndex = 0;
        this.lastRenderMeta = {
            totalMatches: 0,
            currentMatch: 0
        };
        this.notifySearchStateChange();
    }

    getContent() {
        return this.terminal.textContent || '';
    }

    getHTML() {
        return this.terminal.innerHTML;
    }

    setAutoScroll(enabled) {
        this.autoScroll = enabled;
    }

    isAutoScrollEnabled() {
        return this.autoScroll;
    }

    setShowTimestamps(enabled) {
        this.showTimestamps = enabled;
    }

    setMaxLines(maxLines) {
        this.maxLines = maxLines;
    }

    getLineCount() {
        return this.lineCount;
    }

    scrollToTop() {
        this.terminal.scrollTop = 0;
    }

    scrollToEnd() {
        scrollToBottom(this.terminal);
    }

    scrollToLine(lineNumber) {
        const lines = this.terminal.children;
        if (lineNumber >= 0 && lineNumber < lines.length) {
            lines[lineNumber].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    selectAll() {
        const range = document.createRange();
        range.selectNodeContents(this.terminal);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }

    copySelection() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            return navigator.clipboard.writeText(selection.toString());
        }
        return Promise.reject(new Error('No text selected'));
    }

    copyAll() {
        return navigator.clipboard.writeText(this.getContent());
    }

    async saveToFile(defaultFileName = null) {
        const content = this.getContent();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = defaultFileName || `terminal-${timestamp}.txt`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    applyStyles(styles) {
        Object.assign(this.terminal.style, styles);
    }

    resetStyles() {
        this.terminal.removeAttribute('style');
    }

    setFilters(filters = {}) {
        const previousSearch = this.filters.search;
        this.filters = {
            ...this.filters,
            ...filters
        };
        if ((filters.search ?? previousSearch) !== previousSearch) {
            this.currentMatchIndex = 0;
        }
        this.renderEntries();
    }

    setTriggerRules(rules = []) {
        this.triggerRules = normalizeTriggerRules(rules);
        this.entries.forEach((entry) => {
            entry.triggerMatches = findMatchingTriggerRules(entry, this.triggerRules);
        });
        this.renderEntries();
        return this.getTriggerRules();
    }

    getTriggerRules() {
        return this.triggerRules.map((rule) => ({ ...rule }));
    }

    getFilters() {
        return { ...this.filters };
    }

    hasActiveFilters() {
        return Boolean(this.filters.search.trim()) || this.filters.type !== 'all';
    }

    renderEntries() {
        const previousAutoScroll = this.autoScroll;
        this.autoScroll = false;
        this.terminal.innerHTML = '';
        this.lastLogLine = null;
        this.lineCount = 0;

        this.visibleEntries = filterTerminalEntries(this.entries, this.filters);
        const totalMatches = this.visibleEntries.length;

        if (totalMatches === 0) {
            this.currentMatchIndex = 0;
        } else if (this.currentMatchIndex >= totalMatches) {
            this.currentMatchIndex = totalMatches - 1;
        }

        this.visibleEntries.forEach((entry, index) => {
            this.appendEntry(entry, true, totalMatches > 0 && index === this.currentMatchIndex);
        });

        this.lastRenderMeta = {
            totalMatches,
            currentMatch: totalMatches > 0 ? this.currentMatchIndex + 1 : 0
        };

        this.autoScroll = previousAutoScroll;
        this.maybeScrollToBottom();
        this.scrollCurrentMatchIntoView();
        this.notifySearchStateChange();
    }

    getSearchState() {
        return { ...this.lastRenderMeta };
    }

    navigateSearchResults(direction = 1) {
        const totalMatches = this.visibleEntries.length;
        if (totalMatches === 0) {
            return this.getSearchState();
        }

        const normalizedDirection = direction < 0 ? -1 : 1;
        this.currentMatchIndex =
            (this.currentMatchIndex + normalizedDirection + totalMatches) % totalMatches;
        this.renderEntries();
        return this.getSearchState();
    }

    focusEntry(entryId, filters = null) {
        if (filters) {
            this.filters = {
                ...this.filters,
                ...filters
            };
        }

        this.visibleEntries = filterTerminalEntries(this.entries, this.filters);
        const entryIndex = this.visibleEntries.findIndex((entry) => entry.id === entryId);
        if (entryIndex === -1) {
            this.renderEntries();
            return false;
        }

        this.currentMatchIndex = entryIndex;
        this.renderEntries();
        return true;
    }

    scrollCurrentMatchIntoView() {
        const currentLine = this.terminal.querySelector('.terminal-search-current');
        if (!currentLine) {
            return;
        }

        currentLine.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }

    notifySearchStateChange() {
        this.onSearchStateChange?.(this.getSearchState());
    }
}
