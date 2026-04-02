const fs = require('fs');
const path = require('path');

describe('repository structure', () => {
    test('uses the application-first layout', () => {
        const root = path.join(__dirname, '..');
        const packageJson = JSON.parse(
            fs.readFileSync(path.join(root, 'package.json'), 'utf8')
        );

        expect(packageJson.main).toBe('apps/desktop/main/main.js');
        expect(packageJson.scripts['web:dev']).toBe('cd apps/web && vite');
        expect(packageJson.scripts['web:build']).toBe('cd apps/web && vite build');
        expect(packageJson.scripts['web:test']).toBe('cd apps/web && playwright test');

        expect(fs.existsSync(path.join(root, 'apps', 'desktop', 'main', 'main.js'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'apps', 'desktop', 'renderer', 'index.html'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'apps', 'desktop', 'services', 'serial-service.js'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'apps', 'web', 'index.html'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'apps', 'web', 'src', 'main.js'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'apps', 'web', 'public', 'manifest.json'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'shared', 'js', 'app', 'AppShell.js'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'shared', 'js', 'components', 'TabComponent.js'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'shared', 'css', 'styles.css'))).toBe(true);
        expect(fs.existsSync(path.join(root, 'generated', 'build-meta.json'))).toBe(true);

        expect(fs.existsSync(path.join(root, 'src'))).toBe(false);
        expect(fs.existsSync(path.join(root, 'web'))).toBe(false);
    });
});
