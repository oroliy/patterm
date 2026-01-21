export class SerialService {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.config = null;
        this.isConnected = false;
        this.readLoopController = null;
        this.eventCallbacks = {
            data: [],
            error: [],
            close: [],
            open: []
        };
    }

    static isSupported() {
        return 'serial' in navigator;
    }

    async requestPort(filters = []) {
        if (!SerialService.isSupported()) {
            throw new Error('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
        }

        const options = filters.length > 0 ? { filters } : {};
        this.port = await navigator.serial.requestPort(options);
        return this.port;
    }

    async getPortInfo() {
        if (!this.port) {
            throw new Error('No port selected. Call requestPort() first.');
        }

        const info = this.port.getInfo();
        return {
            usbVendorId: info.usbVendorId,
            usbProductId: info.usbProductId
        };
    }

    async open(config) {
        console.log('[SerialService] open() called with port:', this.port, 'config:', config);

        if (!this.port) {
            throw new Error('No port selected. Call requestPort() first.');
        }

        const options = {
            baudRate: config.baudRate || 115200,
            dataBits: config.dataBits || 8,
            stopBits: config.stopBits || 1,
            parity: config.parity || 'none',
            bufferSize: config.bufferSize || 255,
            flowControl: config.flowControl || 'none'
        };

        console.log('[SerialService] Opening port with options:', options);
        await this.port.open(options);
        console.log('[SerialService] Port opened successfully');

        this.config = config;
        this.isConnected = true;
        this.emit('open', { config });

        console.log('[SerialService] Starting read loop');
        this.startReading();
    }

    async startReading() {
        console.log('[SerialService] startReading() called, port:', this.port, 'readable:', this.port?.readable);

        if (!this.port?.readable) {
            const error = 'Port opened but not readable. This may indicate a connection issue.';
            console.error('[SerialService]', error);
            this.emit('error', new Error(error));
            return;
        }

        this.readLoopController = new AbortController();
        const signal = this.readLoopController.signal;

        try {
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
            const inputStream = textDecoder.readable;
            const reader = inputStream.getReader();

            console.log('[SerialService] Read loop started');

            while (!signal.aborted) {
                try {
                    const { value, done } = await reader.read();
                    if (done || signal.aborted) {
                        console.log('[SerialService] Read loop done');
                        break;
                    }
                    if (value) {
                        this.emit('data', value);
                    }
                } catch (readError) {
                    if (!signal.aborted) {
                        console.error('[SerialService] Read error:', readError);
                        this.emit('error', readError);
                    }
                    break;
                }
            }
        } catch (error) {
            if (!signal.aborted) {
                console.error('[SerialService] StartReading error:', error);
                this.emit('error', error);
            }
        } finally {
            console.log('[SerialService] Read loop ended');
            this.isConnected = false;
            this.emit('close');
        }
    }

    async write(data) {
        console.log('[SerialService] write() called with data:', data, 'isConnected:', this.isConnected, 'writable:', this.port?.writable);

        if (!this.isConnected || !this.port?.writable) {
            const error = this.isConnected ? 'Port not writable' : 'Port is not open. Call open() first.';
            console.error('[SerialService]', error);
            throw new Error(error);
        }

        try {
            const writer = this.port.writable.getWriter();
            const encoder = new TextEncoderStream();
            const writableStreamClosed = encoder.readable.pipeTo(this.port.writable);
            const inputStream = encoder.writable;
            const streamWriter = inputStream.getWriter();

            await streamWriter.write(data);
            console.log('[SerialService] Data written successfully');

            streamWriter.releaseLock();
        } catch (error) {
            console.error('[SerialService] Write error:', error);
            this.emit('error', error);
            throw error;
        }
    }

    async writeRaw(bytes) {
        if (!this.isConnected || !this.port?.writable) {
            throw new Error('Port is not open. Call open() first.');
        }

        if (!this.writer) {
            this.writer = this.port.writable.getWriter();
        }

        try {
            await this.writer.write(bytes);
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async disconnect() {
        console.log('[SerialService] disconnect() called');

        if (this.readLoopController) {
            console.log('[SerialService] Aborting read loop');
            this.readLoopController.abort();
        }

        if (this.reader) {
            try {
                await this.reader.cancel();
                console.log('[SerialService] Reader cancelled');
            } catch (e) {
                console.error('[SerialService] Error cancelling reader:', e);
            }
        }

        if (this.writer) {
            try {
                await this.writer.close();
                console.log('[SerialService] Writer closed');
            } catch (e) {
                console.error('[SerialService] Error closing writer:', e);
            }
            this.writer = null;
        }

        if (this.port) {
            try {
                await this.port.close();
                console.log('[SerialService] Port closed');
            } catch (e) {
                console.error('[SerialService] Error closing port:', e);
            }
        }

        this.isConnected = false;
        this.reader = null;
    }

    async reconnect() {
        if (!this.config) {
            throw new Error('No previous configuration found. Cannot reconnect.');
        }

        await this.open(this.config);
    }

    on(event, callback) {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].push(callback);
        }
    }

    off(event, callback) {
        if (this.eventCallbacks[event]) {
            const index = this.eventCallbacks[event].indexOf(callback);
            if (index > -1) {
                this.eventCallbacks[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventCallbacks[event]) {
            this.eventCallbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in ${event} callback:`, error);
                }
            });
        }
    }

    getConfig() {
        return { ...this.config };
    }

    getState() {
        return {
            isConnected: this.isConnected,
            config: this.getConfig()
        };
    }
}

export async function listAvailablePorts() {
    if (!SerialService.isSupported()) {
        return [];
    }

    try {
        const ports = await navigator.serial.getPorts();
        return ports.map(port => port.getInfo());
    } catch (error) {
        console.error('Failed to list ports:', error);
        return [];
    }
}
