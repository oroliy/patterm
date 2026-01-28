export const BAUD_RATES = [
    110, 300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 28800,
    38400, 57600, 115200, 230400, 460800, 921600
];

export const DATA_BITS = [5, 6, 7, 8];

export const STOP_BITS = [1, 2];

export const PARITY_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'odd', label: 'Odd' },
    { value: 'even', label: 'Even' }
];

export const FLOW_CONTROL_OPTIONS = [
    { value: 'none', label: 'None' },
    { value: 'hardware', label: 'RTS/CTS' }
];

export const DEFAULT_SERIAL_CONFIG = {
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none'
};

export const THEME_OPTIONS = [
    { value: 'system', label: 'System' },
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' }
];

export const MAX_TERMINAL_LINES = 10000;

export const RATE_CALCULATION_INTERVAL = 1000;

export const TIMESTAMP_FORMAT = 'HH:mm:ss.SSS';

export const STORAGE_KEYS = {
    THEME: 'patterm-theme',
    CONNECTIONS: 'patterm-connections',
    SETTINGS: 'patterm-settings'
};
