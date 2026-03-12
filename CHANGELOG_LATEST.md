# Changelog - Version 0.6.0 (February 1, 2026)

## Unreleased

### Changed
- Added shared serial provider abstractions for Web and Electron renderer flows
- Normalized serial config defaults through a shared helper before tab creation and connection
- Refactored the connection dialog to share one UI shell across Web and Electron flows
- Extracted a shared renderer app shell so Electron and Web reuse the same tab and menu controller logic
- CI now runs required unit, Web E2E, and Electron E2E stages before build and deploy
- Tightened the release pipeline so GitHub Releases only publish from `v*` tags after the Web PWA deploy job completes
- Recorded the current v0.7.0 priority order in `ITERATION_PLAN.md`
- Expanded `ITERATION_PLAN.md` with a v0.8.x to v0.9.0 roadmap covering search/filter, command palette, session restore, triggers, workflows, transaction blocks, and pane layouts
- Replaced the Web CI suite with real dialog-driven connection coverage and removed bypass-oriented debug specs from `web/tests`
- Added a current-tab terminal search and direction filter foundation backed by structured terminal entries
- Added a shared command palette foundation with `Ctrl/Cmd+K` and reusable high-frequency actions
- Added a session restore MVP for Web that brings back disconnected tabs, active tab, and terminal filter state after reload
- Added current-tab search result navigation with match counts, next/previous controls, and active
  in-terminal highlight
- Added per-tab read-only trigger rules with highlight badges for matching terminal entries
- Added a per-tab workflow runner MVP for `send -> wait for match -> timeout` automation flows
- Upgraded `electron-builder` to `26.8.1` to pick up the current proxy-agent dependency chain

### Fixed
- Web SerialService now returns a null config before connection to avoid state access errors
- Fixed typo in virtual serial script error message (removed space before "process")
- Synced README_zh web command list with the English documentation
- Cloudflare Pages deploy now skips cleanly when CI secrets are not configured instead of failing the whole workflow
- Stabilized the CI Web E2E startup/teardown flow with an explicit `web:test:ci` script and `wait-on`
- Replaced the custom `web:test:ci` background Vite process management with Playwright `webServer`
  lifecycle management to prevent the GitHub `Web E2E` job from hanging after tests finish
- Switched the Playwright CI web server command to `exec npx vite` and added a 10-minute Web E2E
  job timeout so GitHub Actions no longer waits indefinitely on wrapper processes
- Aligned the Playwright CI web server health-check URL with Vite's HTTPS `localhost` endpoint so
  the self-signed certificate check no longer times out before tests start
- Added `ignoreHTTPSErrors: true` to the Playwright CI `webServer` config so GitHub Actions accepts
  the local self-signed Vite certificate during server readiness checks
- Fixed terminal rendering so transmitted text and binary serial payloads both appear correctly in the shared main-window terminal
- Fixed terminal filtering to operate on stored entries instead of brittle DOM text scraping
- Fixed Electron terminal exports to honor an injected native save handler instead of forcing browser downloads
- Replaced the Cloudflare Pages deploy GitHub Action wrapper with a direct `wrangler` CLI call so
  the `Deploy Web PWA` job no longer fails during third-party action download
- Fixed the CI Web E2E runner to stop the full Vite process group instead of hanging on shell exit
- Bumped the `tar` override to `7.5.10` to clear the remaining Dependabot tar advisories
- Removed the vulnerable `@tootallnate/once@2` chain by upgrading the packaging toolchain
- Pinned `cacache -> glob` to `10.5.0` to clear the remaining high-severity glob advisory
- Configured the CI workflow with an `electron-builder-binaries` mirror so macOS packaging can fetch DMG tooling reliably
- Pinned the macOS build runner to `macos-15-intel` so DMG packaging uses the supported x64 toolchain on GitHub Actions
- Added an explicit macOS CI prefetch for the `dmg-builder` bundle and wired `CUSTOM_DMGBUILD_PATH` to bypass the broken mirror download path
- Limited the macOS CI packaging path to `x64 DMG` so GitHub Actions no longer blocks on the unstable arm64 DMG detach step

### Tests
- Added logging lifecycle coverage for SerialService
- Added unit coverage for shared serial abstractions
- Added instrumented Jest coverage for shared/Web frontend modules and new unit tests for
  `AppShell`, `TabComponent`, `TerminalComponent`, and `terminalEntries`
- Added unit coverage for `TabManager` state transitions and `ConnectionDialog` port selection /
  connect flows
- Added unit coverage for `WebSerialProvider`, `EventManager`, and `LogManager`
- Added unit coverage for shared core helpers plus deeper `TabComponent` and `AppShell` behaviors

## Major New Features

### Patterm Web (PWA) 🌐
- **Progressive Web App**: Browser-based serial terminal using Web Serial API
- **Offline Support**: Service worker for offline functionality
- **Installable**: Can be installed as desktop app from browser
- **Responsive UI**: Design matching desktop version
- **Browser Support**: Chrome 89+, Edge 89+, Opera 75+

### Code Refactoring 🏗️
- **Shared Code Modules**: Extracted common CSS and JavaScript to reduce duplication
  - `src/shared/css/base.css`: 500 lines of shared styles
  - `src/shared/js/constants.js`: Serial port and theme constants
  - `src/shared/js/formatters.js`: Data formatting functions
  - `src/shared/js/theme.js`: Theme utilities
  - `src/shared/js/utils.js`: General utility functions
- **Reduced CSS Duplication**: Desktop CSS -78%, web CSS -52%

### E2E Testing 🧪
- **Playwright Test Suite**: Comprehensive E2E tests for web version
- **Virtual Serial Integration**: Tests with mock echo port
- **Test Coverage**: Connection flow, send/receive operations, debug features

### GitHub Automation 🤖
- **Dependabot**: Automated dependency updates configuration
- **Opencode Workflow**: AI-powered PR/issue comment handling

## Improvements

### User Interface
- **Global Search Across Tabs**: Search terminal entries across all open tabs and jump directly to the matching line with `All`, `RX`, `TX`, or `Error` scope
- **Read-Only Trigger Highlights**: Add per-tab rules to mark matching `RX`, `TX`, and `Error` lines without changing serial traffic
- **Workflow Runner MVP**: Build a simple per-tab automation flow with run, stop, response matching, and timeout failure states
- **Transaction Panel MVP**: Group terminal traffic into request/response or passive blocks and jump back to the source terminal entry
- **Transaction Actions**: Star important blocks and copy or export a single transaction directly from the Blocks panel
- **Transaction Triage**: Rename blocks and filter the panel to `All`, `Failed`, or `Starred` transactions
- **Transaction Failure Summaries**: Show the first error line for failed blocks and export all currently visible blocks in one action
- **Explicit Theme Modes**: Header theme control now exposes `System`, `Dark`, and `Light` instead of cycling blindly
- **Refreshed About Dialog**: Simplified About panel now shows current surface, theme, tab count, and active workspace features
- **Status Bar Visual Design**: Full width, no padding gaps, transparent background
- **Status Bar Positioning**: Fixed cut-off issue with proper CSS padding
- **Real-time Rate Updates**: Status bar rates update immediately on data transfer
- **Rate Decay**: Rates reset to 0 B/s after 2 seconds of inactivity

### Developer Experience
- **Coverage Gate Passing**: Expanded Jest coverage across shared UI, Web bootstrap, and Electron window helper modules so `npm run test:coverage` now passes locally
- **Trigger Coverage**: Added Jest and Playwright coverage for rule matching, trigger persistence, and in-terminal highlighting
- **Workflow Coverage**: Added Jest and Playwright coverage for workflow normalization, runner execution, and UI state changes
- **Transaction Coverage**: Added Jest and Playwright coverage for grouping, block panel rendering, and jump navigation
- **Transaction Actions Coverage**: Added unit and Web E2E coverage for star, copy, and export behavior in the Blocks panel
- **Transaction Triage Coverage**: Added unit coverage for rename and failed/starred filtering in the Blocks panel
- **Transaction Export Coverage**: Added unit coverage for failure summary extraction and visible-block export
- **Conditional Debug Logging**: Debug utility with localStorage/URL toggle
- **Improved Serial Port Opening**: Better async handling with proper event ordering
- **Enhanced Error Messages**: More descriptive errors with context

## Bug Fixes

### Security 🔒
- **tar**: 7.5.3 → 7.5.7 (high severity vulnerabilities)
- **lodash**: 4.17.21 → 4.17.23 (moderate severity vulnerability)
- **electron**: 40.0.0 (kept at latest stable)

### Serial Port
- Fixed port selection not being passed to connection handler
- Improved error handling in SerialService for Web Serial API
- Added proper stream cleanup on disconnect
- Enhanced validation and debugging

### Status Bar
- Removed duplicate `.main-content` CSS definition
- Fixed terminal display updates on data send
- Resolved positioning cut-off at viewport edge

## Dependency Updates

### Production Dependencies
- **@serialport/parser-delimiter**: 12.0.0 → 13.0.0
- **@serialport/parser-readline**: 12.0.0 → 13.0.0
- **serialport**: 12.0.0 → 13.0.0

**Breaking Change**: SerialPort 13.0.0 drops Node 16 and 18 support (requires Node 20+)

### New Dev Dependencies
- **@playwright/test**: ^1.57.0 (E2E testing)
- **@vitejs/plugin-basic-ssl**: ^1.0.0 (HTTPS dev server)
- **vite**: ^5.0.0 (Web build tool)

## New NPM Scripts

```bash
npm run web:dev      # Start Vite dev server (HTTPS, localhost:5173)
npm run web:build    # Build web version for production
npm run web:preview  # Preview production build
npm run web:serve    # Serve with HTTPS
npm run web:test     # Run Playwright E2E tests
```

## Documentation

- Updated CLAUDE.md with context menu and IPC patterns
- Updated AGENTS.md with testing workflows
- Added VIRTUAL_SERIAL_README.md for testing with virtual serial ports
- Removed TODO_STATUS_BAR.md (converted to GitHub issues, all resolved)

## Migration Notes

### For Desktop Users
- No breaking changes for desktop application
- All existing features preserved

### For Web Users
- Requires browser with Web Serial API support (Chrome, Edge, Opera)
- HTTPS required for Web Serial API (localhost is exempt)
- Service worker enabled for offline support

### For Developers
- Minimum Node.js version: 20.x (due to serialport 13.0.0)
- Shared code modules should be used instead of duplicating code
- Debug logging can be enabled via `localStorage.setItem('patterm_debug', 'true')`

---

## Version 0.5.0 Features (January 18, 2026)

### Context Menus
- **Tab Right-Click Menu**: Comprehensive context menu with quick actions
- **Terminal Right-Click Menu**: Quick terminal actions

### Enhanced Status Bar
- Compact configuration display (e.g., `/tmp/ttyV0 @ 115200 8N1`)
- Connection duration timer
- Connection created time display
- Current real-time clock
- Cleaner RX/TX indicators with animated pulse effect

---

## Full Commit History

For detailed commit history, see: https://github.com/oroliy/patterm/commits/master/
