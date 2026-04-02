export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatRate(bytesPerSecond) {
    return formatBytes(bytesPerSecond) + '/s';
}

export function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function formatTimestamp(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `[${h}:${m}:${s}.${ms}]`;
}

export function formatDuration(startTime) {
    if (!startTime) return '--:--:--';
    const now = Date.now();
    const diff = Math.floor((now - startTime) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatConnectionStatus(config) {
    const { baudRate, dataBits, parity, stopBits } = config;
    return `${baudRate} ${dataBits}${parity.charAt(0).toUpperCase()}${stopBits}`;
}

export function formatPortName(port) {
    if (typeof port === 'string') return port;
    return port?.path || port?.portId || 'Unknown';
}
