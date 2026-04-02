const path = require('path');

const mockSpawn = jest.fn();

jest.mock('child_process', () => ({
    spawn: (...args) => mockSpawn(...args),
}));

jest.mock('electron', () => '/mock/electron');

describe('launch-electron script', () => {
    const originalArgv = process.argv.slice();
    const originalRunAsNode = process.env.ELECTRON_RUN_AS_NODE;

    beforeEach(() => {
        jest.resetModules();
        mockSpawn.mockReset();
        process.argv = [
            originalArgv[0],
            path.join(__dirname, '..', 'scripts', 'launch-electron.js'),
            '--inspect-brk',
            '--remote-debugging-port=9222',
        ];
        process.env.ELECTRON_RUN_AS_NODE = '1';
    });

    afterAll(() => {
        process.argv = originalArgv;

        if (originalRunAsNode === undefined) {
            delete process.env.ELECTRON_RUN_AS_NODE;
            return;
        }

        process.env.ELECTRON_RUN_AS_NODE = originalRunAsNode;
    });

    test('forwards extra CLI arguments to Electron and clears ELECTRON_RUN_AS_NODE', () => {
        const child = {
            on: jest.fn(),
        };
        mockSpawn.mockReturnValue(child);

        require('../scripts/launch-electron');

        expect(mockSpawn).toHaveBeenCalledTimes(1);

        const [binary, args, options] = mockSpawn.mock.calls[0];
        expect(binary).toBe('/mock/electron');
        expect(args).toEqual([
            '.',
            '--inspect-brk',
            '--remote-debugging-port=9222',
        ]);
        expect(options.cwd).toBe(path.join(__dirname, '..'));
        expect(options.env.ELECTRON_RUN_AS_NODE).toBeUndefined();
        expect(options.stdio).toBe('inherit');
        expect(child.on).toHaveBeenCalledWith('exit', expect.any(Function));
    });
});
