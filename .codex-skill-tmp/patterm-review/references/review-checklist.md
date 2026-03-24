## Review Checklist

Use this checklist to keep reviews concrete and repository-aware.

### Shared Logic

- Did a `src/shared/` change unintentionally alter both Web and Electron behavior?
- Does the affected feature still align with `web/tests/connection-ui.spec.js` coverage expectations?

### Electron And IPC

- Are IPC inputs validated in the main process?
- Are error paths descriptive and surfaced back to the renderer?
- Did a file-dialog, menu, or native behavior change create a platform-specific regression?

### Web And UI

- Did terminal search, filters, session restore, or command palette behavior change without matching coverage?
- Is Web-only behavior drifting away from Electron when it should stay shared?

### Tests

- Was the narrowest meaningful command run?
- Does the change clearly require `npm run web:test:ci`, `npm run test:electron`, or `npm run test:ci`?
- If tests were not run, is that gap called out explicitly?

### Documentation And Release

- Did user-facing behavior change without updating `README.md` and `README_zh.md`?
- Did release-facing or feature-facing changes skip `CHANGELOG.md` or `CHANGELOG_LATEST.md`?
- Did version references, download links, badges, or packaging notes drift out of sync?

### Review Output

- Findings first
- Severity order
- File and line references
- Residual risks only after findings
