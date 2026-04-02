#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = process.cwd();
const TARGETS = ['apps', 'shared', 'tests'];
const IGNORED_SEGMENTS = new Set(['node_modules', 'dist', '.git']);
const EXTENSIONS = new Set(['.js', '.mjs']);
const BUILTIN_GLOBALS = new Set([
    'Array',
    'ArrayBuffer',
    'Boolean',
    'Buffer',
    'Date',
    'Error',
    'Function',
    'JSON',
    'Map',
    'Math',
    'Object',
    'Promise',
    'RegExp',
    'Set',
    'String',
    'Uint8Array',
    'URL',
    'URLSearchParams',
    'TextDecoder',
    'TextEncoder',
    'ReadableStream',
    'WritableStream',
    'AbortController',
    'AbortSignal',
    'Blob',
    'FormData',
    'parseInt',
    'parseFloat',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
    'setImmediate',
    'clearImmediate',
    'queueMicrotask',
    'structuredClone',
    'undefined',
    'console',
    'globalThis',
]);
const NODE_GLOBALS = new Set(['process', 'module', 'exports', 'require', '__dirname', '__filename', 'global']);
const BROWSER_GLOBALS = new Set([
    'window',
    'document',
    'navigator',
    'HTMLElement',
    'Node',
    'CustomEvent',
    'Event',
    'EventTarget',
    'localStorage',
    'sessionStorage',
    'fetch',
    'FileReader',
    'MutationObserver',
    'ResizeObserver',
    'requestAnimationFrame',
    'cancelAnimationFrame',
    'matchMedia',
    'location',
    'history',
    'crypto',
    'performance',
    'alert',
    'confirm',
    'prompt',
    'self',
    'caches',
]);
const JEST_GLOBALS = new Set([
    'jest',
    'describe',
    'test',
    'it',
    'expect',
    'beforeEach',
    'afterEach',
    'beforeAll',
    'afterAll',
]);

function listFiles(dirPath, files = []) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        if (IGNORED_SEGMENTS.has(entry.name)) {
            continue;
        }
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            listFiles(fullPath, files);
            continue;
        }
        if (EXTENSIONS.has(path.extname(entry.name))) {
            files.push(fullPath);
        }
    }
    return files;
}

function getAllowedGlobals(filePath) {
    const allowed = new Set([...BUILTIN_GLOBALS, ...NODE_GLOBALS]);
    if (
        filePath.includes(`${path.sep}apps${path.sep}web${path.sep}`) ||
        filePath.includes(`${path.sep}apps${path.sep}desktop${path.sep}renderer${path.sep}`) ||
        filePath.includes(`${path.sep}shared${path.sep}`)
    ) {
        for (const name of BROWSER_GLOBALS) {
            allowed.add(name);
        }
    }
    if (
        filePath.includes(`${path.sep}tests${path.sep}`) ||
        filePath.includes(`${path.sep}apps${path.sep}web${path.sep}tests${path.sep}`)
    ) {
        for (const name of JEST_GLOBALS) {
            allowed.add(name);
        }
        for (const name of BROWSER_GLOBALS) {
            allowed.add(name);
        }
    }
    return allowed;
}

function parseFile(filePath, source) {
    return parser.parse(source, {
        sourceType: 'unambiguous',
        allowReturnOutsideFunction: false,
        plugins: [
            'classProperties',
            'classStaticBlock',
            'dynamicImport',
            'importMeta',
            'optionalChaining',
            'nullishCoalescingOperator',
            'objectRestSpread',
            'topLevelAwait',
        ],
        errorRecovery: false,
    });
}

function lintFile(filePath) {
    const source = fs.readFileSync(filePath, 'utf8');
    const allowedGlobals = getAllowedGlobals(filePath);
    const issues = [];
    let ast;

    try {
        ast = parseFile(filePath, source);
    } catch (error) {
        issues.push({
            filePath,
            line: error.loc ? error.loc.line : 1,
            column: error.loc ? error.loc.column + 1 : 1,
            message: error.message,
        });
        return issues;
    }

    traverse(ast, {
        Program(programPath) {
            for (const binding of Object.values(programPath.scope.bindings)) {
                if (
                    !binding.referenced &&
                    !binding.identifier.name.startsWith('_') &&
                    binding.kind !== 'module'
                ) {
                    issues.push({
                        filePath,
                        line: binding.identifier.loc.start.line,
                        column: binding.identifier.loc.start.column + 1,
                        message: `'${binding.identifier.name}' is defined but never used.`,
                    });
                }
            }
        },
        Identifier(identifierPath) {
            if (!identifierPath.isReferencedIdentifier()) {
                return;
            }
            const name = identifierPath.node.name;
            if (name.startsWith('_')) {
                return;
            }
            if (identifierPath.scope.hasBinding(name) || identifierPath.scope.hasGlobal(name)) {
                return;
            }
            if (allowedGlobals.has(name)) {
                return;
            }
            issues.push({
                filePath,
                line: identifierPath.node.loc.start.line,
                column: identifierPath.node.loc.start.column + 1,
                message: `'${name}' is not defined.`,
            });
        },
        Scope(scopePath) {
            if (!scopePath.scope.block || scopePath.isProgram()) {
                return;
            }
            for (const binding of Object.values(scopePath.scope.bindings)) {
                if (
                    !binding.referenced &&
                    !binding.identifier.name.startsWith('_') &&
                    binding.kind !== 'module'
                ) {
                    issues.push({
                        filePath,
                        line: binding.identifier.loc.start.line,
                        column: binding.identifier.loc.start.column + 1,
                        message: `'${binding.identifier.name}' is defined but never used.`,
                    });
                }
            }
        },
    });

    const uniqueIssues = new Map();
    for (const issue of issues) {
        uniqueIssues.set(`${issue.filePath}:${issue.line}:${issue.column}:${issue.message}`, issue);
    }
    return [...uniqueIssues.values()];
}

const files = TARGETS
    .map((target) => path.join(ROOT, target))
    .filter((targetPath) => fs.existsSync(targetPath))
    .flatMap((targetPath) => listFiles(targetPath))
    .sort();

const issues = files.flatMap((filePath) => lintFile(filePath));

if (issues.length > 0) {
    for (const issue of issues) {
        console.error(`${path.relative(ROOT, issue.filePath)}:${issue.line}:${issue.column} ${issue.message}`);
    }
    console.error(`\nLint failed with ${issues.length} issue(s).`);
    process.exit(1);
}

console.log(`Lint passed for ${files.length} file(s) in apps/, shared/, and tests/.`);
