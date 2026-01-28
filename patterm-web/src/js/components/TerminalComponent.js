import { formatTimestamp, formatBytes, isScrolledToBottom, scrollToBottom } from '../utils/helpers.js';
import { MAX_TERMINAL_LINES } from '../utils/constants.js';

export class TerminalComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.terminal = container;
        this.autoScroll = options.autoScroll ?? true;
        this.showTimestamps = options.showTimestamps ?? true;
        this.lastLogLine = null;
        this.lineCount = 0;
        this.maxLines = options.maxLines ?? MAX_TERMINAL_LINES;
        this.dataBuffer = '';
    }

    appendData(data, type = 'rx') {
        const normalizedText = this.normalizeNewlines(data);
        this.processBufferedData(normalizedText, type);
    }

    normalizeNewlines(text) {
        return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    processBufferedData(text, type) {
        this.dataBuffer += text;
        const parts = this.dataBuffer.split('\n');
        this.dataBuffer = parts.pop() || '';

        parts.forEach((part) => {
            this.appendLine(part, type, true);
        });
    }

    appendLine(text, type, hasNewline = true) {
        if (this.lineCount >= this.maxLines) {
            this.pruneOldLines();
        }

        const line = this.createLineElement(text, type);

        if (this.lastLogLine && this.canAppendToLastLine(type)) {
            const textNode = document.createTextNode(text);
            this.lastLogLine.appendChild(textNode);
        } else if (text.length > 0 || hasNewline) {
            if (this.showTimestamps) {
                const tsSpan = this.createTimestampSpan();
                line.appendChild(tsSpan);
            }
            const textNode = document.createTextNode(text);
            line.appendChild(textNode);
            this.terminal.appendChild(line);
            this.lastLogLine = line;
            this.lineCount++;
        }

        if (hasNewline) {
            this.lastLogLine = null;
        }

        this.maybeScrollToBottom();
    }

    createLineElement(text, type) {
        const line = document.createElement('div');
        line.className = `${type}-data`;
        return line;
    }

    canAppendToLastLine(type) {
        return this.lastLogLine && this.lastLogLine.classList.contains(type + '-data');
    }

    createTimestampSpan() {
        const tsSpan = document.createElement('span');
        tsSpan.className = 'timestamp';
        tsSpan.textContent = formatTimestamp(new Date());
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
        this.appendData(text, 'rx');
    }

    appendTransmitted(data) {
        const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
        this.appendData(`> ${text}`, 'tx');
    }

    appendError(error) {
        const text = error instanceof Error ? error.message : String(error);
        this.appendLine(`Error: ${text}`, 'error');
    }

    appendInfo(message) {
        this.appendLine(`[INFO] ${message}`, 'info');
    }

    clear() {
        this.terminal.innerHTML = '';
        this.lastLogLine = null;
        this.lineCount = 0;
        this.dataBuffer = '';
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
}
