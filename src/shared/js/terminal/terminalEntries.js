export function createTerminalEntry({ text, type = 'rx', timestamp = new Date() }) {
    const entryTimestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);

    return {
        id: `${entryTimestamp.getTime()}-${Math.random().toString(36).slice(2, 9)}`,
        text: normalizeTerminalEntryText(text),
        type,
        timestamp: entryTimestamp,
    };
}

export function filterTerminalEntries(entries, filters = {}) {
    const {
        search = '',
        type = 'all',
    } = filters;

    const normalizedSearch = search.trim().toLowerCase();

    return entries.filter((entry) => {
        if (type !== 'all' && entry.type !== type) {
            return false;
        }

        if (!normalizedSearch) {
            return true;
        }

        return entry.text.toLowerCase().includes(normalizedSearch);
    });
}

export function normalizeTerminalEntryText(value) {
    if (typeof value === 'string') {
        return value;
    }

    if (value instanceof Uint8Array) {
        return new TextDecoder().decode(value);
    }

    if (value instanceof ArrayBuffer) {
        return new TextDecoder().decode(new Uint8Array(value));
    }

    if (ArrayBuffer.isView(value)) {
        return new TextDecoder().decode(
            new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        );
    }

    if (value == null) {
        return '';
    }

    return String(value);
}
