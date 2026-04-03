import { findMatchingTriggerRules } from '../terminal/triggerRules.js';

let workflowCounter = 0;
let workflowStepCounter = 0;

const VALID_STEP_TYPES = new Set(['send', 'waitForMatch']);

function getNextWorkflowId() {
    const id = `workflow-${workflowCounter}`;
    workflowCounter += 1;
    return id;
}

function getNextWorkflowStepId() {
    const id = `workflow-step-${workflowStepCounter}`;
    workflowStepCounter += 1;
    return id;
}

export function normalizeWorkflowStep(step = {}) {
    const type = VALID_STEP_TYPES.has(step.type) ? step.type : null;
    if (!type) {
        return null;
    }

    if (type === 'send') {
        const payload = String(step.payload || '');
        if (!payload.trim()) {
            return null;
        }

        return {
            id: step.id || getNextWorkflowStepId(),
            type,
            payload,
        };
    }

    const pattern = String(step.pattern || '').trim();
    if (!pattern) {
        return null;
    }

    return {
        id: step.id || getNextWorkflowStepId(),
        type,
        pattern,
        matchType: step.matchType === 'regex' ? 'regex' : 'contains',
        scope: step.scope || 'rx',
        flags: String(step.flags || '').trim() || 'i',
        timeoutMs: Number.isFinite(step.timeoutMs) && step.timeoutMs > 0
            ? Math.round(step.timeoutMs)
            : 2000,
    };
}

export function normalizeWorkflowDefinition(workflow = {}) {
    const steps = Array.isArray(workflow.steps)
        ? workflow.steps.map((step) => normalizeWorkflowStep(step)).filter(Boolean)
        : [];

    if (steps.length === 0) {
        return null;
    }

    return {
        id: workflow.id || getNextWorkflowId(),
        name: String(workflow.name || '').trim() || 'Workflow',
        steps,
    };
}

export function normalizeWorkflowDefinitions(workflows = []) {
    if (!Array.isArray(workflows)) {
        return [];
    }

    return workflows
        .map((workflow) => normalizeWorkflowDefinition(workflow))
        .filter(Boolean);
}

function getIdleState(workflowId = null) {
    return {
        workflowId,
        status: 'idle',
        currentStepIndex: -1,
        completedStepIds: [],
        error: null,
    };
}

function isStepEntryMatch(step, entry) {
    return findMatchingTriggerRules(entry, [{
        pattern: step.pattern,
        matchType: step.matchType,
        scope: step.scope,
        flags: step.flags,
        enabled: true,
    }]).length > 0;
}

export class WorkflowRunner {
    constructor(workflow, options = {}) {
        this.workflow = normalizeWorkflowDefinition(workflow);
        this.send = options.send || null;
        this.onStateChange = options.onStateChange || null;
        this.timer = null;
        this.pendingEntries = [];
        this.state = getIdleState(this.workflow?.id || null);
    }

    getState() {
        return {
            ...this.state,
            completedStepIds: [...this.state.completedStepIds],
        };
    }

    emitState() {
        this.onStateChange?.(this.getState());
    }

    updateState(patch = {}) {
        this.state = {
            ...this.state,
            ...patch,
        };
        this.emitState();
    }

    async start() {
        if (!this.workflow) {
            this.fail('Workflow definition is invalid');
            return this.getState();
        }

        this.clearTimer();
        this.pendingEntries = [];
        this.state = getIdleState(this.workflow.id);
        this.updateState({
            status: 'running',
            currentStepIndex: 0,
        });

        await this.runCurrentStep();
        return this.getState();
    }

    async runCurrentStep() {
        if (this.state.status !== 'running' || !this.workflow) {
            return;
        }

        const step = this.workflow.steps[this.state.currentStepIndex];
        if (!step) {
            this.complete();
            return;
        }

        if (step.type === 'send') {
            if (typeof this.send !== 'function') {
                this.fail('No workflow send handler is available');
                return;
            }

            try {
                await this.send(step.payload);
            } catch (error) {
                this.fail(error?.message || 'Failed to send workflow step');
                return;
            }

            this.markStepComplete(step.id);
            await this.advance();
            return;
        }

        this.armWaitTimeout(step);
    }

    async advance() {
        const nextIndex = this.state.currentStepIndex + 1;
        if (!this.workflow || nextIndex >= this.workflow.steps.length) {
            this.complete();
            return;
        }

        this.updateState({
            currentStepIndex: nextIndex,
            error: null,
        });
        await this.runCurrentStep();
    }

    armWaitTimeout(step) {
        this.clearTimer();
        const pendingEntry = this.pendingEntries.find((entry) => isStepEntryMatch(step, entry));
        if (pendingEntry) {
            this.pendingEntries = [];
            this.markStepComplete(step.id);
            this.advance();
            return;
        }

        this.timer = setTimeout(() => {
            this.fail(`Timeout waiting for ${step.pattern}`);
        }, step.timeoutMs);
    }

    handleEntry(entry) {
        if (!this.workflow || this.state.status !== 'running') {
            return false;
        }

        const step = this.workflow.steps[this.state.currentStepIndex];
        if (!step || step.type !== 'waitForMatch') {
            this.pendingEntries.push(entry);
            return false;
        }

        if (!isStepEntryMatch(step, entry)) {
            return false;
        }

        this.clearTimer();
        this.markStepComplete(step.id);
        this.advance();
        return true;
    }

    markStepComplete(stepId) {
        this.updateState({
            completedStepIds: [...this.state.completedStepIds, stepId],
            error: null,
        });
    }

    complete() {
        this.clearTimer();
        this.updateState({
            status: 'passed',
            currentStepIndex: this.workflow ? this.workflow.steps.length - 1 : -1,
            error: null,
        });
    }

    fail(message) {
        this.clearTimer();
        this.updateState({
            status: 'failed',
            error: message,
        });
    }

    stop(reason = 'Stopped') {
        if (this.state.status !== 'running') {
            return this.getState();
        }

        this.clearTimer();
        this.updateState({
            status: 'stopped',
            error: reason,
        });
        return this.getState();
    }

    clearTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}
