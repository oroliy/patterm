const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const fs = require('fs');
const path = require('path');

class SerialService {
    constructor() {
        this.port = null;
        this.parser = null;
        this.config = this.getDefaultConfig();
        this.dataListeners = [];
        this.errorListeners = [];
        this.logging = {
            enabled: false,
            filePath: null,
            mode: 'manual',
            stream: null
        };
    }

    getDefaultConfig() {
        return {
            path: '',
            baudRate: 115200,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            rtscts: false,
            xon: false,
            xoff: false,
            xany: false
        };
    }

    async listPorts() {
        try {
            const ports = await SerialPort.list();
            return ports.map(port => ({
                path: port.path,
                manufacturer: port.manufacturer || 'Unknown',
                serialNumber: port.serialNumber || 'Unknown',
                vendorId: port.vendorId || 'Unknown',
                productId: port.productId || 'Unknown'
            }));
        } catch (error) {
            throw new Error(`Failed to list ports: ${error.message}`);
        }
    }

    async open(config) {
        if (this.port && this.port.isOpen) {
            await this.close();
        }

        this.config = { ...this.getDefaultConfig(), ...config };

        try {
            this.port = new SerialPort({
                path: this.config.path,
                baudRate: this.config.baudRate,
                dataBits: this.config.dataBits,
                stopBits: this.config.stopBits,
                parity: this.config.parity
            });

            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

            this.parser.on('data', (data) => {
                this.emitData(data);
                this.writeToLog(data + '\n');
            });

            this.port.on('error', (error) => {
                this.emitError(error.message);
            });

            this.port.on('close', () => {
                this.emitError('Port closed');
            });

            return true;
        } catch (error) {
            this.emitError(error.message);
            throw error;
        }
    }

    async close() {
        if (this.port && this.port.isOpen) {
            return new Promise((resolve) => {
                this.port.close((error) => {
                    if (error) {
                        this.emitError(error.message);
                    }
                    this.port = null;
                    this.parser = null;
                    resolve();
                });
            });
        }
        return true;
    }

    async write(data) {
        if (!this.port || !this.port.isOpen) {
            throw new Error('Port not open');
        }

        try {
            this.port.write(data);
            this.writeToLog(`TX: ${data}\n`);
            return true;
        } catch (error) {
            this.emitError(error.message);
            throw error;
        }
    }

    setConfig(config) {
        this.config = { ...this.config, ...config };
        return this.config;
    }

    getConfig() {
        return this.config;
    }

    isOpen() {
        return this.port && this.port.isOpen;
    }

    on(event, callback) {
        if (event === 'data') {
            this.dataListeners.push(callback);
        } else if (event === 'error') {
            this.errorListeners.push(callback);
        }
    }

    off(event, callback) {
        if (event === 'data') {
            this.dataListeners = this.dataListeners.filter(listener => listener !== callback);
        } else if (event === 'error') {
            this.errorListeners = this.errorListeners.filter(listener => listener !== callback);
        }
    }

    emitData(data) {
        this.dataListeners.forEach(callback => callback(data));
    }

    emitError(error) {
        this.errorListeners.forEach(callback => callback(error));
    }

    async startLogging(filePath, mode = 'manual') {
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            if (this.logging.stream) {
                this.stopLogging();
            }

            this.logging.enabled = true;
            this.logging.filePath = filePath;
            this.logging.mode = mode;
            this.logging.stream = fs.createWriteStream(filePath, { flags: 'a' });

            const timestamp = new Date().toISOString();
            this.logging.stream.write(`=== Logging started at ${timestamp} (Mode: ${mode}) ===\n`);
            this.logging.stream.write(`Port: ${this.config.path}, Baud: ${this.config.baudRate}\n`);

            return true;
        } catch (error) {
            throw new Error(`Failed to start logging: ${error.message}`);
        }
    }

    stopLogging() {
        if (this.logging.stream) {
            const timestamp = new Date().toISOString();
            this.logging.stream.write(`=== Logging stopped at ${timestamp} ===\n\n`);
            this.logging.stream.end();
            this.logging.stream = null;
        }
        this.logging.enabled = false;
        this.logging.filePath = null;
        this.logging.mode = 'manual';
        return true;
    }

    writeToLog(data) {
        if (this.logging.enabled && this.logging.stream) {
            const timestamp = new Date().toISOString();
            this.logging.stream.write(`[${timestamp}] ${data}`);
        }
    }

    getLoggingStatus() {
        return {
            enabled: this.logging.enabled,
            filePath: this.logging.filePath,
            mode: this.logging.mode
        };
    }
}

module.exports = SerialService;
