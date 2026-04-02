import { DEFAULT_SERIAL_CONFIG } from '../constants.js';

export function normalizeSerialConfig(config = {}) {
    return {
        ...DEFAULT_SERIAL_CONFIG,
        ...config
    };
}
