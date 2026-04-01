const { readFileSync } = require('fs');
const { join } = require('path');

describe('web PWA asset paths', () => {
    test('manifest uses deployment-relative URLs', () => {
        const manifestPath = join(__dirname, '..', 'web', 'public', 'manifest.json');
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

        expect(manifest.start_url).toBe('./');
        expect(manifest.scope).toBe('./');
        expect(manifest.icons.every((icon) => icon.src.startsWith('./'))).toBe(true);
        expect(manifest.shortcuts.every((shortcut) => shortcut.url.startsWith('./'))).toBe(true);
        expect(
            manifest.shortcuts.every((shortcut) =>
                shortcut.icons.every((icon) => icon.src.startsWith('./'))
            )
        ).toBe(true);
    });
});
