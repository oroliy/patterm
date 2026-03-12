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

export const THEME_VARIANTS = [
    {
        value: 'default',
        label: 'Patterm Blue',
        shortLabel: 'Blue',
        description: 'Cool glass panels with electric blue accents',
        swatches: ['#3b82f6', '#10b981', '#0f172a']
    },
    {
        value: 'claude',
        label: 'Claude Canvas',
        shortLabel: 'Claude',
        description: 'Warm paper surfaces with terracotta and ink contrasts',
        swatches: ['#c46a36', '#e9dcc6', '#2f241d']
    },
    {
        value: 'forest',
        label: 'Verdant Lab',
        shortLabel: 'Forest',
        description: 'Earthy greens, moss glass, and copper utility accents',
        swatches: ['#1f7a5a', '#d4b483', '#11261f']
    },
    {
        value: 'signal',
        label: 'Signal Grid',
        shortLabel: 'Signal',
        description: 'Terminal-forward phosphor tones with industrial contrast',
        swatches: ['#7dff9b', '#f4b860', '#09120d']
    }
];

export const MAX_TERMINAL_LINES = 10000;

export const RATE_CALCULATION_INTERVAL = 1000;

export const TIMESTAMP_FORMAT = 'HH:mm:ss.SSS';

export const STORAGE_KEYS = {
    THEME: 'patterm-theme',
    THEME_VARIANT: 'patterm-theme-variant',
    CONNECTIONS: 'patterm-connections',
    SETTINGS: 'patterm-settings',
    SESSION: 'patterm-session'
};
