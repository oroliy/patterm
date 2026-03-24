## Verification Matrix

Use this file to choose the smallest command set that still gives meaningful confidence.

### File Area -> Primary Checks

- `src/shared/js/`
  Run `npm test` if unit tests cover the changed logic.
  Run `npm run web:test:ci` when the change affects terminal UI, filters, search, session restore, or command palette behavior.

- `src/web/js/` or `web/`
  Run `npm run web:test:ci`.
  If build or service worker behavior changed, consider `npm run web:build`.

- `src/renderer/`
  Check whether the same behavior also exists under `src/shared/js/` or `src/web/js/`.
  Prefer at least the relevant Web test path, and run `npm run test:electron` when the Electron renderer behavior diverges from Web.

- `src/main/` or `src/services/`
  Run `npm run test:electron` when the change affects Electron lifecycle, IPC, dialogs, or serial integration.
  Inspect error handling and argument validation even if tests are narrow.

- `.github/workflows/` or release/build scripts
  Prefer `npm run test:ci` when feasible.
  If the change is workflow-only and local execution is not feasible, state that clearly.

### Change Type -> Documentation Follow-Up

- Feature behavior changed
  Update `README.md`, `README_zh.md`, and the changelog files when user-facing behavior or commands changed.

- Release/version/build output changed
  Update `README.md`, `README_zh.md`, `CHANGELOG.md`, `CHANGELOG_LATEST.md`, and verify `package.json` version alignment.

- Test commands or CI flow changed
  Update both README files and mention the exact command path in the final response.

- IPC contract, context menu, or agent workflow assumptions changed
  Check whether `CLAUDE.md` should also be updated.

### Default Close-Out

- Report what changed.
- Report which commands ran.
- Report what was not verified.
- Report whether documentation sync was performed or intentionally skipped.
