const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const outputPath = path.join(rootDir, 'src/generated/build-meta.json');

function getCommitId() {
    if (process.env.PATTERM_COMMIT_ID) {
        return process.env.PATTERM_COMMIT_ID;
    }

    try {
        return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
            cwd: rootDir,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch (error) {
        return 'unknown';
    }
}

function main() {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const buildMeta = {
        version: packageJson.version,
        commitId: getCommitId(),
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(buildMeta, null, 4)}\n`, 'utf8');
    process.stdout.write(`Wrote build metadata to ${outputPath}\n`);
}

main();
