# Changelog - Version 0.6.0 (February 1, 2026)

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
- **Status Bar Visual Design**: Full width, no padding gaps, transparent background
- **Status Bar Positioning**: Fixed cut-off issue with proper CSS padding
- **Real-time Rate Updates**: Status bar rates update immediately on data transfer
- **Rate Decay**: Rates reset to 0 B/s after 2 seconds of inactivity

### Developer Experience
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
