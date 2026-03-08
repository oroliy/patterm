import { BaseSerialProvider } from '../../../shared/js/serial/BaseSerialProvider.js';
import { normalizeSerialConfig } from '../../../shared/js/serial/normalizeSerialConfig.js';
import { debug } from '../utils/debug.js';

export class WebSerialProvider extends BaseSerialProvider {
    constructor() {
        super();
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.readLoopController = null;
    }

    static isSupported() {
        return 'serial' in navigator;
    }

    async requestPort(filters = []) {
        if (!WebSerialProvider.isSupported()) {
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
        debug.log('[WebSerialProvider] open() called with port:', this.port, 'config:', config);

        if (!this.port) {
            throw new Error('No port selected. Call requestPort() first.');
        }

        const normalizedConfig = normalizeSerialConfig(config);
        const options = {
            baudRate: normalizedConfig.baudRate,
            dataBits: normalizedConfig.dataBits,
            stopBits: normalizedConfig.stopBits,
            parity: normalizedConfig.parity,
            bufferSize: normalizedConfig.bufferSize || 255,
            flowControl: normalizedConfig.flowControl
        };

        debug.log('[WebSerialProvider] Opening port with options:', options);
        await this.port.open(options);
        debug.log('[WebSerialProvider] Port opened successfully');

        this.setConfig(normalizedConfig);
        this.setConnected(true);
        this.emit('open', { config: normalizedConfig });

        debug.log('[WebSerialProvider] Starting read loop');
        this.startReading();
    }

    async startReading() {
        debug.log('[WebSerialProvider] startReading() called, port:', this.port, 'readable:', this.port?.readable);

        if (!this.port?.readable) {
            const error = 'Port opened but not readable. This may indicate a connection issue.';
            debug.error('[WebSerialProvider]', error);
            this.emit('error', new Error(error));
            return;
        }

        this.readLoopController = new AbortController();
        const signal = this.readLoopController.signal;

        try {
            const textDecoder = new TextDecoderStream();
            const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
            const inputStream = textDecoder.readable;
            this.reader = inputStream.getReader();

            debug.log('[WebSerialProvider] Read loop started');

            while (!signal.aborted) {
                try {
                    const { value, done } = await this.reader.read();
                    if (done || signal.aborted) {
                        debug.log('[WebSerialProvider] Read loop done');
                        break;
                    }
                    if (value) {
                        this.emit('data', value);
                    }
                } catch (readError) {
                    if (!signal.aborted) {
                        debug.error('[WebSerialProvider] Read error:', readError);
                        this.emit('error', readError);
                    }
                    break;
                }
            }

            await readableStreamClosed.catch(() => null);
        } catch (error) {
            if (!signal.aborted) {
                debug.error('[WebSerialProvider] StartReading error:', error);
                this.emit('error', error);
            }
        } finally {
            debug.log('[WebSerialProvider] Read loop ended');
            this.reader = null;
            this.setConnected(false);
            this.emit('close');
        }
    }

    async write(data) {
        debug.log('[WebSerialProvider] write() called with data:', data, 'isConnected:', this.isConnected, 'writable:', this.port?.writable);

        if (!this.isConnected || !this.port?.writable) {
            const error = this.isConnected ? 'Port not writable' : 'Port is not open. Call open() first.';
            debug.error('[WebSerialProvider]', error);
            throw new Error(error);
        }

        try {
            const encoder = new TextEncoder();
            const encodedData = encoder.encode(data);
            const writer = this.port.writable.getWriter();
            await writer.write(encodedData);
            writer.releaseLock();
            debug.log('[WebSerialProvider] Data written successfully');
        } catch (error) {
            debug.error('[WebSerialProvider] Write error:', error);
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
        debug.log('[WebSerialProvider] disconnect() called');

        if (this.readLoopController) {
            debug.log('[WebSerialProvider] Aborting read loop');
            this.readLoopController.abort();
            this.readLoopController = null;
        }

        if (this.reader) {
            try {
                await this.reader.cancel();
                debug.log('[WebSerialProvider] Reader cancelled');
            } catch (error) {
                debug.error('[WebSerialProvider] Error cancelling reader:', error);
            }
            this.reader = null;
        }

        if (this.writer) {
            try {
                await this.writer.close();
                debug.log('[WebSerialProvider] Writer closed');
            } catch (error) {
                debug.error('[WebSerialProvider] Error closing writer:', error);
            }
            this.writer = null;
        }

        if (this.port) {
            try {
                await this.port.close();
                debug.log('[WebSerialProvider] Port closed');
            } catch (error) {
                debug.error('[WebSerialProvider] Error closing port:', error);
            }
        }

        this.setConnected(false);
    }

    async reconnect() {
        const config = this.getConfig();
        if (!config) {
            throw new Error('No previous configuration found. Cannot reconnect.');
        }

        await this.open(config);
    }
}

export const SerialService = WebSerialProvider;

export async function listAvailablePorts() {
    if (!WebSerialProvider.isSupported()) {
        return [];
    }

    try {
        const ports = await navigator.serial.getPorts();
        return ports.map((port) => port.getInfo());
    } catch (error) {
        debug.error('Failed to list ports:', error);
        return [];
    }
}
