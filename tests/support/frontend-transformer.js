const exportNames = [];

function transformImports(source) {
    let transformed = source.replace(
        /import\s+\{([^}]+)\}\s+from\s+'([^']+)';/g,
        (_match, imports, specifier) => `const { ${imports.trim()} } = require('${specifier}');`
    );

    transformed = transformed.replace(
        /export\s+\{([^}]+)\}\s+from\s+'([^']+)';/g,
        (_match, exportsList, specifier) => {
            const names = exportsList.split(',').map((item) => item.trim()).filter(Boolean);
            names.forEach((name) => exportNames.push(name));
            return `const { ${exportsList.trim()} } = require('${specifier}');`;
        }
    );

    return transformed;
}

function transformExports(source) {
    let transformed = source.replace(/export async function (\w+)/g, (_match, name) => {
        exportNames.push(name);
        return `async function ${name}`;
    });

    transformed = transformed.replace(/export function (\w+)/g, (_match, name) => {
        exportNames.push(name);
        return `function ${name}`;
    });

    transformed = transformed.replace(/export class (\w+)/g, (_match, name) => {
        exportNames.push(name);
        return `class ${name}`;
    });

    transformed = transformed.replace(/export const (\w+)\s*=/g, (_match, name) => {
        exportNames.push(name);
        return `const ${name} =`;
    });

    return transformed;
}

module.exports = {
    process(sourceText, sourcePath) {
        exportNames.length = 0;

        if (!sourcePath.includes('/src/')) {
            return { code: sourceText };
        }

        let transformed = transformImports(sourceText);
        transformed = transformExports(transformed);

        if (exportNames.length > 0) {
            transformed += `\nmodule.exports = { ${Array.from(new Set(exportNames)).join(', ')} };`;
        }

        return { code: transformed };
    },
};
