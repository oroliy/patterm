export class LogManager {
    constructor() {
        this.fileHandle = null;
        this.writable = null;
        this.isLogging = false;
        this.logQueue = [];
        this.flushInterval = null;
    }

    static isSupported() {
        return 'showSaveFilePicker' in window;
    }

    async startLogging(defaultFileName = null) {
        if (!LogManager.isSupported()) {
            throw new Error('File System Access API is not supported in this browser.');
        }

        if (this.isLogging) {
            return true;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = defaultFileName || `serial-log-${timestamp}.txt`;

        try {
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Text Files',
                    accept: { 'text/plain': ['.txt', '.log'] }
                }]
            });

            this.writable = await this.fileHandle.createWritable();
            this.isLogging = true;

            await this.writeHeader();

            this.startFlushInterval();

            return true;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to start logging:', error);
            }
            return false;
        }
    }

    async writeHeader() {
        if (!this.writable) return;

        const header = `=== Patterm Serial Log - ${new Date().toISOString()} ===\n\n`;
        await this.writable.write(header);
    }

    async log(data, options = {}) {
        if (!this.isLogging) {
            return;
        }

        const { timestamp = true, type = 'data' } = options;

        let logLine = '';
        if (timestamp) {
            const ts = new Date().toISOString();
            logLine += `[${ts}] `;
        }
        if (type) {
            logLine += `[${type.toUpperCase()}] `;
        }
        logLine += data;

        this.logQueue.push(logLine);
    }

    async logData(data, direction = 'RX') {
        let displayData = data;
        if (typeof data === 'string') {
            displayData = data;
        } else if (data instanceof Uint8Array) {
            displayData = Array.from(data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        }

        await this.log(displayData, { type: direction });
    }

    startFlushInterval() {
        this.flushInterval = setInterval(() => {
            this.flush();
        }, 1000);
    }

    async flush() {
        if (this.logQueue.length === 0 || !this.writable) {
            return;
        }

        const chunk = this.logQueue.splice(0, this.logQueue.length).join('\n') + '\n';
        try {
            await this.writable.write(chunk);
        } catch (error) {
            console.error('Failed to write log:', error);
            this.logQueue.unshift(chunk);
        }
    }

    async stopLogging() {
        if (!this.isLogging) {
            return;
        }

        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }

        await this.flush();

        if (this.writable) {
            try {
                await this.writeFooter();
                await this.writable.close();
            } catch (error) {
                console.error('Failed to close log file:', error);
            }
            this.writable = null;
        }

        this.isLogging = false;
        this.fileHandle = null;
    }

    async writeFooter() {
        if (!this.writable) return;

        const footer = `\n=== Log ended: ${new Date().toISOString()} ===\n`;
        await this.writable.write(footer);
    }

    async saveTabContent(content, defaultFileName = null) {
        if (!LogManager.isSupported()) {
            throw new Error('File System Access API is not supported in this browser.');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const fileName = defaultFileName || `terminal-output-${timestamp}.txt`;

        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: 'Text Files',
                    accept: { 'text/plain': ['.txt'] }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(content);
            await writable.close();

            return true;
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Failed to save file:', error);
            }
            return false;
        }
    }

    isActive() {
        return this.isLogging;
    }

    getQueueSize() {
        return this.logQueue.length;
    }
}
