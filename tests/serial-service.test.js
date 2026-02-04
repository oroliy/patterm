const fs = require('fs');
const os = require('os');
const path = require('path');

const SerialService = require('../src/services/serial-service');

describe('SerialService', () => {
    let service;

    beforeEach(() => {
        service = new SerialService();
    });

    afterEach(() => {
        if (service && service.isOpen()) {
            service.close();
        }
    });

    describe('Constructor', () => {
        test('should create service with default config', () => {
            expect(service.port).toBeNull();
            expect(service.parser).toBeNull();
            expect(service.config.baudRate).toBe(115200);
            expect(service.config.dataBits).toBe(8);
            expect(service.config.stopBits).toBe(1);
            expect(service.config.parity).toBe('none');
        });

        test('should have empty listeners arrays', () => {
            expect(service.dataListeners).toEqual([]);
            expect(service.errorListeners).toEqual([]);
        });

        test('should have logging disabled by default', () => {
            expect(service.logging.enabled).toBe(false);
            expect(service.logging.filePath).toBeNull();
        });
    });

    describe('getDefaultConfig', () => {
        test('should return default serial port configuration', () => {
            const config = service.getDefaultConfig();
            expect(config).toEqual({
                path: '',
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                rtscts: false,
                xon: false,
                xoff: false,
                xany: false
            });
        });
    });

    describe('setConfig and getConfig', () => {
        test('should merge config with existing config', () => {
            service.setConfig({ baudRate: 9600, dataBits: 7 });
            const config = service.getConfig();
            expect(config.baudRate).toBe(9600);
            expect(config.dataBits).toBe(7);
            expect(config.stopBits).toBe(1);
        });

        test('should get current config', () => {
            const config = service.getConfig();
            expect(config.path).toBe('');
            expect(config.baudRate).toBe(115200);
        });
    });

    describe('isOpen', () => {
        test('should return falsy when port is not open', () => {
            expect(service.isOpen()).toBeFalsy();
        });
    });

    describe('Event listeners', () => {
        test('should add data listener', () => {
            const callback = jest.fn();
            service.on('data', callback);
            expect(service.dataListeners).toContain(callback);
        });

        test('should add error listener', () => {
            const callback = jest.fn();
            service.on('error', callback);
            expect(service.errorListeners).toContain(callback);
        });

        test('should remove data listener', () => {
            const callback = jest.fn();
            service.on('data', callback);
            service.off('data', callback);
            expect(service.dataListeners).not.toContain(callback);
        });

        test('should remove error listener', () => {
            const callback = jest.fn();
            service.on('error', callback);
            service.off('error', callback);
            expect(service.errorListeners).not.toContain(callback);
        });

        test('should emit data to all listeners', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            service.on('data', callback1);
            service.on('data', callback2);
            service.emitData('test data');
            expect(callback1).toHaveBeenCalledWith('test data');
            expect(callback2).toHaveBeenCalledWith('test data');
        });

        test('should emit error to all listeners', () => {
            const callback1 = jest.fn();
            const callback2 = jest.fn();
            service.on('error', callback1);
            service.on('error', callback2);
            service.emitError('test error');
            expect(callback1).toHaveBeenCalledWith('test error');
            expect(callback2).toHaveBeenCalledWith('test error');
        });
    });

    describe('write', () => {
        test('should throw error when port is not open', async () => {
            await expect(service.write('test')).rejects.toThrow('Port not open');
        });
    });

    describe('getLoggingStatus', () => {
        test('should return logging status', () => {
            const status = service.getLoggingStatus();
            expect(status).toEqual({
                enabled: false,
                filePath: null,
                mode: 'manual'
            });
        });
    });

    describe('logging lifecycle', () => {
        test('should create log file and reset status on stop', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patterm-log-'));
            const filePath = path.join(tmpDir, 'log.txt');

            try {
                await service.startLogging(filePath, 'manual');
                expect(service.getLoggingStatus()).toEqual({
                    enabled: true,
                    filePath,
                    mode: 'manual'
                });
                service.stopLogging();
                expect(fs.existsSync(filePath)).toBe(true);
                expect(service.getLoggingStatus()).toEqual({
                    enabled: false,
                    filePath: null,
                    mode: 'manual'
                });
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
    });

    describe('close', () => {
        test('should close successfully when port is not open', async () => {
            await expect(service.close()).resolves.toBe(true);
        });
    });
});
