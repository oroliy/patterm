import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { resolve } from 'path';

export default defineConfig({
    plugins: [basicSsl()],
    root: '.',
    publicDir: 'public',
    base: './',
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
