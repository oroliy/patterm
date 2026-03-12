import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

function getCommitId() {
    try {
        return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
            cwd: resolve(__dirname, '..'),
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch (error) {
        return 'unknown';
    }
}

export default defineConfig({
    plugins: [basicSsl()],
    root: '.',
    publicDir: 'public',
    base: './',
    define: {
        __PATTERM_VERSION__: JSON.stringify(packageJson.version),
        __PATTERM_COMMIT_ID__: JSON.stringify(getCommitId()),
    },
    resolve: {
        alias: {
            '/src': resolve(__dirname, '../src')
        }
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        target: 'es2020'
    },
    server: {
        https: true,
        port: 5173,
        strictPort: true
    }
});
