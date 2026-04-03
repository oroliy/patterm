const { spawn } = require('child_process');
const path = require('path');

const electronBinary = require('electron');
const projectRoot = path.join(__dirname, '..');
const env = { ...process.env };
const electronArgs = ['.', ...process.argv.slice(2)];

delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBinary, electronArgs, {
    cwd: projectRoot,
    env,
    stdio: 'inherit',
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 0);
});
