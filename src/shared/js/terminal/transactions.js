const DEFAULT_TRANSACTION_WINDOW_MS = 1000;

let transactionCounter = 0;

function getNextTransactionId() {
    const id = `transaction-${transactionCounter}`;
    transactionCounter += 1;
    return id;
}

function toTimestampMs(value) {
    if (value instanceof Date) {
        return value.getTime();
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? Date.now() : date.getTime();
}

function cloneEntry(entry) {
    return {
        ...entry,
    };
}

export function createTransactionGroup(entry, transactionId = getNextTransactionId()) {
    const summary = entry.type === 'tx'
        ? entry.text
        : entry.text || '(empty line)';

    return {
        id: transactionId,
        startedAt: entry.timestamp,
        endedAt: entry.timestamp,
        type: entry.type === 'tx' ? 'request-response' : 'passive',
        summary,
        requestEntryId: entry.type === 'tx' ? entry.id : null,
        firstEntryId: entry.id,
        lastEntryId: entry.id,
        entryIds: [entry.id],
        counts: {
            rx: entry.type === 'rx' ? 1 : 0,
            tx: entry.type === 'tx' ? 1 : 0,
            error: entry.type === 'error' ? 1 : 0,
            info: entry.type === 'info' ? 1 : 0,
        },
    };
}

function appendEntryToTransaction(transaction, entry) {
    transaction.endedAt = entry.timestamp;
    transaction.lastEntryId = entry.id;
    transaction.entryIds.push(entry.id);
    transaction.counts[entry.type] = (transaction.counts[entry.type] || 0) + 1;

    if (!transaction.summary && entry.text) {
        transaction.summary = entry.text;
    }
}

function shouldAppendToTransaction(transaction, entry, windowMs) {
    const lastTimestamp = toTimestampMs(transaction.endedAt);
    const entryTimestamp = toTimestampMs(entry.timestamp);
    return entryTimestamp - lastTimestamp <= windowMs;
}

export function assignEntryToTransactions(entry, transactions = [], options = {}) {
    const windowMs = Number.isFinite(options.windowMs) && options.windowMs > 0
        ? options.windowMs
        : DEFAULT_TRANSACTION_WINDOW_MS;
    const nextTransactions = transactions.map((transaction) => ({
        ...transaction,
        counts: {
            ...transaction.counts,
        },
        entryIds: [...transaction.entryIds],
    }));
    const nextEntry = cloneEntry(entry);
    const lastTransaction = nextTransactions[nextTransactions.length - 1];

    if (!lastTransaction) {
        const transaction = createTransactionGroup(nextEntry);
        nextEntry.transactionId = transaction.id;
        return { entry: nextEntry, transactions: [transaction] };
    }

    if (nextEntry.type === 'tx') {
        const transaction = createTransactionGroup(nextEntry);
        nextEntry.transactionId = transaction.id;
        nextTransactions.push(transaction);
        return { entry: nextEntry, transactions: nextTransactions };
    }

    if (shouldAppendToTransaction(lastTransaction, nextEntry, windowMs)) {
        nextEntry.transactionId = lastTransaction.id;
        appendEntryToTransaction(lastTransaction, nextEntry);
        return { entry: nextEntry, transactions: nextTransactions };
    }

    const transaction = createTransactionGroup(nextEntry);
    nextEntry.transactionId = transaction.id;
    nextTransactions.push(transaction);
    return { entry: nextEntry, transactions: nextTransactions };
}
