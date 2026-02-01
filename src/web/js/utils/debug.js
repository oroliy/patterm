const DEBUG_KEY = 'patterm_debug';
const URL_PARAM = 'pattermDebug';

function isDebugEnabled() {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DEBUG_KEY) === 'true' || new URLSearchParams(window.location.search).has(URL_PARAM);
}

export function setDebugEnabled(enabled) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DEBUG_KEY, enabled ? 'true' : 'false');
}

export const debug = {
    log: (...args) => {
        if (isDebugEnabled()) console.log('[Patterm]', ...args);
    },
    error: (...args) => {
        console.error('[Patterm]', ...args);
    },
    warn: (...args) => {
        if (isDebugEnabled()) console.warn('[Patterm]', ...args);
    }
};
