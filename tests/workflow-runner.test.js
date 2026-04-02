describe('Workflow runner', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('normalizes workflows and completes send plus wait flow', async () => {
        const {
            normalizeWorkflowDefinitions,
            WorkflowRunner,
        } = require('../shared/js/workflows/workflows.js');

        const workflows = normalizeWorkflowDefinitions([{
            name: 'Handshake',
            steps: [
                { type: 'send', payload: 'AT' },
                { type: 'waitForMatch', pattern: 'Echo: AT', scope: 'rx', timeoutMs: 1000 },
            ],
        }]);

        expect(workflows).toHaveLength(1);
        expect(workflows[0].steps).toHaveLength(2);

        const send = jest.fn(() => Promise.resolve());
        const runner = new WorkflowRunner(workflows[0], { send });

        await runner.start();
        expect(send).toHaveBeenCalledWith('AT');
        expect(runner.getState()).toEqual(expect.objectContaining({
            status: 'running',
            currentStepIndex: 1,
            completedStepIds: [workflows[0].steps[0].id],
        }));

        expect(runner.handleEntry({ text: 'Echo: AT', type: 'rx' })).toBe(true);
        expect(runner.getState()).toEqual(expect.objectContaining({
            status: 'passed',
            completedStepIds: [workflows[0].steps[0].id, workflows[0].steps[1].id],
        }));
    });

    test('fails on timeout and supports manual stop', async () => {
        const { WorkflowRunner } = require('../shared/js/workflows/workflows.js');
        const runner = new WorkflowRunner({
            name: 'Timeout test',
            steps: [
                { type: 'waitForMatch', pattern: 'READY', scope: 'rx', timeoutMs: 500 },
            ],
        }, {
            send: jest.fn(),
        });

        await runner.start();
        jest.advanceTimersByTime(500);
        expect(runner.getState()).toEqual(expect.objectContaining({
            status: 'failed',
            error: 'Timeout waiting for READY',
        }));

        const stoppable = new WorkflowRunner({
            name: 'Stop test',
            steps: [
                { type: 'waitForMatch', pattern: 'BOOT', scope: 'rx', timeoutMs: 1000 },
            ],
        });
        await stoppable.start();
        stoppable.stop();
        expect(stoppable.getState()).toEqual(expect.objectContaining({
            status: 'stopped',
            error: 'Stopped',
        }));
    });
});
