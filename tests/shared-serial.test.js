const fs = require('fs');
const path = require('path');

function loadFrontendModule(relativePath, cache = new Map()) {
    const absolutePath = path.join(__dirname, '..', relativePath);
    if (cache.has(absolutePath)) {
        return cache.get(absolutePath);
    }

    let source = fs.readFileSync(absolutePath, 'utf8');
    const exports = [];

    source = source.replace(/import\s+\{([^}]+)\}\s+from\s+'([^']+)';/g, (_match, imports, specifier) => {
        const resolvedPath = path.join(path.dirname(relativePath), specifier);
        return `const { ${imports.trim()} } = __load('${resolvedPath}');`;
    });

    source = source.replace(/export class (\w+)/g, (_match, name) => {
        exports.push(name);
        return `class ${name}`;
    });

    source = source.replace(/export function (\w+)/g, (_match, name) => {
        exports.push(name);
        return `function ${name}`;
    });

    source = source.replace(/export const (\w+)\s*=/g, (_match, name) => {
        exports.push(name);
        return `const ${name} =`;
    });

    const factory = new Function('__load', `${source}\nreturn { ${exports.join(', ')} };`);
    const moduleExports = factory((specifier) => loadFrontendModule(specifier, cache));
    cache.set(absolutePath, moduleExports);
    return moduleExports;
}

describe('shared serial abstractions', () => {
    test('BaseSerialProvider stores config and state safely', () => {
        const { BaseSerialProvider } = loadFrontendModule('shared/js/serial/BaseSerialProvider.js');
        const provider = new BaseSerialProvider();

        provider.setConfig({ baudRate: 9600, parity: 'even' });
        provider.setConnected(true);

        const config = provider.getConfig();
        config.baudRate = 115200;

        expect(provider.getConfig()).toEqual({ baudRate: 9600, parity: 'even' });
        expect(provider.getState()).toEqual({
            isConnected: true,
            config: { baudRate: 9600, parity: 'even' }
        });
    });

    test('BaseSerialProvider manages event listeners', () => {
        const { BaseSerialProvider } = loadFrontendModule('shared/js/serial/BaseSerialProvider.js');
        const provider = new BaseSerialProvider();
        const received = [];
        const callback = (payload) => received.push(payload);

        provider.on('data', callback);
        provider.emit('data', 'first');
        provider.off('data', callback);
        provider.emit('data', 'second');

        expect(received).toEqual(['first']);
    });

    test('normalizeSerialConfig merges defaults with overrides', () => {
        const { normalizeSerialConfig } = loadFrontendModule('shared/js/serial/normalizeSerialConfig.js');

        expect(normalizeSerialConfig({ baudRate: 57600, parity: 'odd' })).toEqual({
            baudRate: 57600,
            dataBits: 8,
            stopBits: 1,
            parity: 'odd',
            flowControl: 'none'
        });
    });
});
