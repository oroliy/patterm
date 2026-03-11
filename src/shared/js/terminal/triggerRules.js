let triggerRuleCounter = 0;

const VALID_MATCH_TYPES = new Set(['contains', 'regex']);
const VALID_SCOPES = new Set(['all', 'rx', 'tx', 'error', 'info']);
const VALID_HIGHLIGHTS = new Set(['info', 'warning', 'success', 'danger']);

function getNextTriggerRuleId() {
    const id = `trigger-${triggerRuleCounter}`;
    triggerRuleCounter += 1;
    return id;
}

function normalizeTriggerScope(scope) {
    return VALID_SCOPES.has(scope) ? scope : 'all';
}

function normalizeTriggerMatchType(matchType) {
    return VALID_MATCH_TYPES.has(matchType) ? matchType : 'contains';
}

function normalizeTriggerHighlight(highlight) {
    return VALID_HIGHLIGHTS.has(highlight) ? highlight : 'warning';
}

export function normalizeTriggerRule(rule = {}) {
    const pattern = String(rule.pattern || '').trim();
    if (!pattern) {
        return null;
    }

    return {
        id: rule.id || getNextTriggerRuleId(),
        name: String(rule.name || '').trim() || pattern,
        pattern,
        matchType: normalizeTriggerMatchType(rule.matchType),
        scope: normalizeTriggerScope(rule.scope),
        highlight: normalizeTriggerHighlight(rule.highlight),
        flags: String(rule.flags || '').trim() || 'i',
        enabled: rule.enabled !== false,
    };
}

export function normalizeTriggerRules(rules = []) {
    if (!Array.isArray(rules)) {
        return [];
    }

    return rules
        .map((rule) => normalizeTriggerRule(rule))
        .filter(Boolean);
}

function isRuleScopeMatch(entryType, ruleScope) {
    return ruleScope === 'all' || ruleScope === entryType;
}

function isContainsMatch(text, pattern) {
    return String(text || '').toLowerCase().includes(String(pattern || '').toLowerCase());
}

function isRegexMatch(text, pattern, flags) {
    try {
        return new RegExp(pattern, flags || 'i').test(String(text || ''));
    } catch (error) {
        return false;
    }
}

export function findMatchingTriggerRules(entry, rules = []) {
    if (!entry) {
        return [];
    }

    return normalizeTriggerRules(rules).filter((rule) => {
        if (!rule.enabled || !isRuleScopeMatch(entry.type, rule.scope)) {
            return false;
        }

        if (rule.matchType === 'regex') {
            return isRegexMatch(entry.text, rule.pattern, rule.flags);
        }

        return isContainsMatch(entry.text, rule.pattern);
    });
}
