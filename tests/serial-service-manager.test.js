const SerialServiceManager = require('../src/services/serial-service-manager');

describe('SerialServiceManager', () => {
    let manager;

    beforeEach(() => {
        manager = new SerialServiceManager();
    });

    afterEach(async () => {
        await manager.closeAll();
    });

    describe('Constructor', () => {
        test('should initialize with empty services map', () => {
            expect(manager.services instanceof Map).toBe(true);
            expect(manager.services.size).toBe(0);
            expect(manager.tabCounter).toBe(0);
        });
    });

    describe('getService', () => {
        test('should return null for non-existent tab', () => {
            expect(manager.getService('non-existent')).toBeUndefined();
        });

        test('should return service data for existing tab', async () => {
            const mockService = {
                open: jest.fn().mockResolvedValue(true),
                isOpen: jest.fn().mockReturnValue(false),
                close: jest.fn().mockResolvedValue(true),
                getDefaultConfig: jest.fn().mockReturnValue({ baudRate: 115200 })
            };

            manager.services.set('test-tab', {
                id: 'test-tab',
                service: mockService,
                config: { path: '/dev/ttyUSB0' }
            });

            const result = manager.getService('test-tab');
            expect(result).toBeDefined();
            expect(result.id).toBe('test-tab');
        });
    });

    describe('getConfig', () => {
        test('should return null for non-existent tab', () => {
            expect(manager.getConfig('non-existent')).toBeNull();
        });

        test('should return config for existing tab', () => {
            const mockConfig = { path: '/dev/ttyUSB0', baudRate: 9600 };
            manager.services.set('test-tab', {
                id: 'test-tab',
                config: mockConfig
            });

            expect(manager.getConfig('test-tab')).toEqual(mockConfig);
        });
    });

    describe('getTabInfo', () => {
        test('should return null for non-existent tab', () => {
            expect(manager.getTabInfo('non-existent')).toBeNull();
        });

        test('should return tab info for existing tab', () => {
            const tabData = {
                id: 'test-tab',
                tabName: 'Test Port',
                connected: true,
                config: {
                    path: '/dev/ttyUSB0',
                    baudRate: 9600
                }
            };
            manager.services.set('test-tab', tabData);

            const info = manager.getTabInfo('test-tab');
            expect(info).toEqual({
                id: 'test-tab',
                tabName: 'Test Port',
                connected: true,
                portPath: '/dev/ttyUSB0',
                baudRate: 9600
            });
        });
    });

    describe('getAllTabInfos', () => {
        test('should return empty array when no tabs exist', () => {
            expect(manager.getAllTabInfos()).toEqual([]);
        });

        test('should return info for all tabs', () => {
            manager.services.set('tab1', {
                id: 'tab1',
                tabName: 'Port 1',
                connected: true,
                config: { path: '/dev/ttyUSB0', baudRate: 9600 }
            });
            manager.services.set('tab2', {
                id: 'tab2',
                tabName: 'Port 2',
                connected: true,
                config: { path: '/dev/ttyUSB1', baudRate: 115200 }
            });

            const infos = manager.getAllTabInfos();
            expect(infos).toHaveLength(2);
            expect(infos[0].id).toBe('tab1');
            expect(infos[1].id).toBe('tab2');
        });
    });

    describe('isConnected', () => {
        test('should return false for non-existent tab', () => {
            expect(manager.isConnected('non-existent')).toBe(false);
        });

        test('should return connection status for existing tab', () => {
            const mockService = {
                isOpen: jest.fn().mockReturnValue(false),
                close: jest.fn().mockResolvedValue(true)
            };
            manager.services.set('test-tab', {
                id: 'test-tab',
                service: mockService
            });

            expect(manager.isConnected('test-tab')).toBe(false);
            expect(mockService.isOpen).toHaveBeenCalled();
        });
    });

    describe('updateTabName', () => {
        test('should return false for non-existent tab', () => {
            expect(manager.updateTabName('non-existent', 'New Name')).toBe(false);
        });

        test('should update tab name for existing tab', () => {
            manager.services.set('test-tab', {
                id: 'test-tab',
                tabName: 'Old Name'
            });

            expect(manager.updateTabName('test-tab', 'New Name')).toBe(true);
            expect(manager.services.get('test-tab').tabName).toBe('New Name');
        });
    });

    describe('write', () => {
        test('should throw error for non-existent tab', async () => {
            await expect(manager.write('non-existent', 'data')).rejects.toThrow('Service not found for tab');
        });

        test('should write data to service', async () => {
            const mockService = {
                write: jest.fn().mockResolvedValue(true),
                isOpen: jest.fn().mockReturnValue(false),
                close: jest.fn().mockResolvedValue(true)
            };
            manager.services.set('test-tab', {
                id: 'test-tab',
                service: mockService
            });

            await manager.write('test-tab', 'test data');
            expect(mockService.write).toHaveBeenCalledWith('test data');
        });
    });

    describe('onData and offData', () => {
        test('should do nothing for non-existent tab', () => {
            const callback = jest.fn();
            expect(manager.onData('non-existent', callback)).toBeUndefined();
            expect(manager.offData('non-existent', callback)).toBeUndefined();
        });

        test('should register data listener', () => {
            const mockService = {
                on: jest.fn(),
                isOpen: jest.fn().mockReturnValue(false),
                close: jest.fn().mockResolvedValue(true)
            };
            const callback = jest.fn();
            manager.services.set('test-tab', {
                id: 'test-tab',
                service: mockService
            });

            manager.onData('test-tab', callback);
            expect(mockService.on).toHaveBeenCalledWith('data', callback);
        });

        test('should unregister data listener', () => {
            const mockService = {
                off: jest.fn(),
                isOpen: jest.fn().mockReturnValue(false),
                close: jest.fn().mockResolvedValue(true)
            };
            const callback = jest.fn();
            manager.services.set('test-tab', {
                id: 'test-tab',
                service: mockService
            });

            manager.offData('test-tab', callback);
            expect(mockService.off).toHaveBeenCalledWith('data', callback);
        });
    });

    describe('onError and offError', () => {
        test('should register error listener', () => {
            const mockService = {
                on: jest.fn(),
                isOpen: jest.fn().mockReturnValue(false),
                close: jest.fn().mockResolvedValue(true)
            };
            const callback = jest.fn();
            manager.services.set('test-tab', {
                id: 'test-tab',
                service: mockService
            });

            manager.onError('test-tab', callback);
            expect(mockService.on).toHaveBeenCalledWith('error', callback);
        });

        test('should unregister error listener', () => {
            const mockService = {
                off: jest.fn(),
                isOpen: jest.fn().mockReturnValue(false),
                close: jest.fn().mockResolvedValue(true)
            };
            const callback = jest.fn();
            manager.services.set('test-tab', {
                id: 'test-tab',
                service: mockService
            });

            manager.offError('test-tab', callback);
            expect(mockService.off).toHaveBeenCalledWith('error', callback);
        });
    });

    describe('closeConnection', () => {
        test('should return false for non-existent tab', async () => {
            expect(await manager.closeConnection('non-existent')).toBe(false);
        });

        test('should close connection but keep service provided', async () => {
            const mockService = {
                isOpen: jest.fn().mockReturnValue(true),
                close: jest.fn().mockResolvedValue(true)
            };
            manager.services.set('test-tab', {
                id: 'test-tab',
                service: mockService,
                connected: true
            });

            expect(await manager.closeConnection('test-tab')).toBe(true);
            expect(manager.services.has('test-tab')).toBe(true);
            expect(manager.services.get('test-tab').connected).toBe(false);
            expect(mockService.close).toHaveBeenCalled();
        });
    });

    describe('removeConnection', () => {
        test('should return false for non-existent tab', async () => {
            expect(await manager.removeConnection('non-existent')).toBe(false);
        });

        test('should close connection and remove service', async () => {
            const mockService = {
                isOpen: jest.fn().mockReturnValue(true),
                close: jest.fn().mockResolvedValue(true)
            };
            manager.services.set('test-tab', {
                id: 'test-tab',
                service: mockService
            });

            expect(await manager.removeConnection('test-tab')).toBe(true);
            expect(manager.services.has('test-tab')).toBe(false);
            expect(mockService.close).toHaveBeenCalled();
        });
    });

    describe('closeAll', () => {
        test('should close all services and clear map', async () => {
            const mockService1 = {
                isOpen: jest.fn().mockReturnValue(true),
                close: jest.fn().mockResolvedValue(true)
            };
            const mockService2 = {
                isOpen: jest.fn().mockReturnValue(true),
                close: jest.fn().mockResolvedValue(true)
            };

            manager.services.set('tab1', { service: mockService1 });
            manager.services.set('tab2', { service: mockService2 });

            await manager.closeAll();

            expect(mockService1.close).toHaveBeenCalled();
            expect(mockService2.close).toHaveBeenCalled();
            expect(manager.services.size).toBe(0);
        });
    });
});
