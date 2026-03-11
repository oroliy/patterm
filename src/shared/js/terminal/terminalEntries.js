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

export function findTerminalEntryMatchRanges(text, search) {
    const normalizedText = normalizeTerminalEntryText(text);
    const normalizedSearch = normalizeTerminalEntryText(search).trim().toLowerCase();

    if (!normalizedSearch) {
        return [];
    }

    const lowerText = normalizedText.toLowerCase();
    const ranges = [];
    let startIndex = 0;

    while (startIndex < lowerText.length) {
        const matchIndex = lowerText.indexOf(normalizedSearch, startIndex);
        if (matchIndex === -1) {
            break;
        }

        ranges.push({
            start: matchIndex,
            end: matchIndex + normalizedSearch.length,
        });
        startIndex = matchIndex + normalizedSearch.length;
    }

    return ranges;
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
