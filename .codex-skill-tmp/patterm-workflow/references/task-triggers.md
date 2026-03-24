## Task Triggers

Use these examples to infer the default path when the user request is underspecified.

### UI And Terminal Requests

- "fix terminal search"
  Start in `src/shared/js/app/AppShell.js` and terminal-related components.
  Inspect `web/tests/connection-ui.spec.js`.
  Prefer `npm run web:test:ci`.

- "the tab state is not restored"
  Inspect shared tab/session code first, then Web and Electron integration points.
  Check search/filter persistence and disconnected-tab behavior.
  Prefer `npm run web:test:ci`.

- "theme toggle is broken"
  Inspect shared theme state plus `src/main/main.js` if Electron theme sync is involved.
  Run the narrowest relevant UI test, and use `npm run test:electron` if desktop-specific behavior changed.

### Serial And IPC Requests

- "connection fails" or "reconnect is broken"
  Inspect `src/services/`, `src/main/main.js`, and the matching Web serial path if behavior should match across surfaces.
  Check config normalization, connection lifecycle, and error propagation.

- "save output" or "logging is broken"
  Inspect logging flow in shared and platform-specific services.
  Check whether file-dialog behavior is Electron-only or mirrored on Web.

- "IPC needs cleanup" or "add a new IPC"
  Inspect `src/main/main.js` first.
  Validate arguments, returned shape, and error handling.
  Check whether `CLAUDE.md` and user docs need updates.

### CI And Workflow Requests

- "CI is failing"
  Inspect `.github/workflows/` and `package.json`.
  Prefer `npm run test:ci` when feasible.
  Use the `gh-fix-ci` skill if the task is specifically about GitHub Actions failures.

- "address review comments"
  Inspect the touched files and the complaint first.
  Use the `gh-address-comments` skill when the task is explicitly about PR feedback or unresolved review threads.

### Release And Documentation Requests

- "prepare release" or "bump version"
  Check `package.json` version first.
  Update `README.md`, `README_zh.md`, `CHANGELOG.md`, and `CHANGELOG_LATEST.md`.
  Verify release links and version references stay aligned.

- "update docs"
  Determine whether English and Chinese READMEs both need the change.
  If the change is user-facing behavior, expect changelog updates too.

### Security Requests

- "review security" or "is this Electron change safe"
  Inspect IPC boundaries, file access, and any renderer-to-main data flow.
  Use the `security-best-practices` skill when the task explicitly asks for security review or hardening.
