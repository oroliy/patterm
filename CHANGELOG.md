# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Web SerialService now returns a null config before connection to avoid state access errors
- Fixed typo in virtual serial script error message (removed space before "process")
- Synced README_zh web command list with the English documentation

### Tests
- Added logging lifecycle coverage for SerialService

---

## [0.6.0] - 2026-02-01

### Added
- **Patterm Web (PWA)**: Browser-based serial terminal using Web Serial API
  - Progressive Web App with offline support
  - Installable as desktop app from browser
  - Service worker for offline functionality
  - Responsive UI matching desktop version
  - Browser support: Chrome 89+, Edge 89+, Opera 75+
- **Code Refactoring**: Shared modules to reduce duplication
  - `src/shared/css/base.css`: 500 lines of shared styles
  - `src/shared/js/constants.js`, `formatters.js`, `theme.js`, `utils.js`
  - Desktop CSS reduced by 78%, web CSS by 52%
- **E2E Testing**: Playwright test suite with virtual serial integration
- **GitHub Automation**: Dependabot and Opencode workflow configuration
- **Conditional Debug Logging**: Debug utility with localStorage/URL toggle
- **Rate Decay**: Status bar rates reset to 0 B/s after 2 seconds of inactivity

### Changed
- **Node.js Requirement**: Minimum version now 20.x (serialport 13.0.0 drops Node 16/18)
- **Status Bar**: Full width, no padding gaps, transparent background, real-time updates
- **electron**: Updated to 40.0.0 (latest stable)

### Fixed
- Security vulnerabilities: tar (7.5.3→7.5.7), lodash (4.17.21→4.17.23)
- Status bar positioning cut-off at viewport edge
- Duplicate `.main-content` CSS definition removed
- Real-time rate updates now trigger immediately on data transfer
- Serial port opening with proper async handling
- Web Serial API error handling and debugging improvements

### New NPM Scripts
```bash
npm run web:dev      # Start Vite dev server (HTTPS, localhost:5173)
npm run web:build    # Build web version for production
npm run web:preview  # Preview production build
npm run web:serve    # Serve with HTTPS
npm run web:test     # Run Playwright E2E tests
```

---

## [0.5.0] - 2026-01-18

### Added
- **Tab Right-Click Context Menu**:
  - Close Tab, Disconnect/Reconnect, Clear Screen
  - Save Output to file, Start/Stop Logging
  - Copy All Text, Rename Tab, Show Connection Settings
- **Terminal Right-Click Context Menu**:
  - Clear Screen, Save Output, Copy All Text
- **Status Bar Improvements**:
  - Full serial port configuration in compact format (e.g., '115200 8N1')
  - Connection Duration display (shows time since connection established)
  - Connection Created time display
  - Current real-time clock
- **IPC Handlers**: New context menu actions and tab operations

### Changed
- Removed duplicate RX/TX rate text sections, keeping icon-only badges for cleaner UI
- Status bar now displays all key metrics in a compact, organized layout

### Developer
- Updated AGENTS.md to require running lint and tests before committing

---

## [0.4.0] - 2026-01-18

### Added
- **Timestamp Display**: Millisecond-precision timestamps on all serial data lines
- **Enhanced Newline Handling**: Proper support for CRLF (\\r\\n) and CR (\\r) line endings
- **RX/TX Byte Counters**: Real-time byte counters for received and transmitted data
- **Status Bar**: Comprehensive status bar with:
  - Port name and connection status
  - RX/TX byte totals
  - Data rate indicators (B/s) with animated badges
  - Connection duration
  - Created time and current time
- **Windows Virtual Serial Support**:
  - `scripts/setup-com0com.bat` - Automated com0com configuration
  - `scripts/virtual-serial-win.py` - PySerial-based virtual serial bridge
- **In-App Debug Logging**: Enhanced debug logging for renderer diagnostics

### Changed
- Optimized terminal rendering to handle partial data chunks correctly
- Robust reconnect logic with preserved connection configuration

### Fixed
- Serial data now displays as text instead of numeric arrays
- Connection dialog port dropdown now works correctly (removed default value interference)
- Restored missing `updateConnectionStatus` function in tab renderer
- Removed reference to deleted `tabDuration` element to prevent crash loop
- Raw serial data support enabled with proper buffer handling
- Input placeholder visibility restored

---

## [0.3.0] - 2025-01-17

### Added
- **Testing Framework**: Jest test framework with 39 test cases
  - Unit tests for SerialService and SerialServiceManager
  - Coverage thresholds configured (50%)
  - Test scripts: `npm test`, `npm run test:watch`, `npm run test:coverage`
- **Multi-Architecture Builds**:
  - macOS: x64 + ARM64 (Apple Silicon) DMG
  - Linux: x64 + ARM64 AppImage and deb packages
  - Windows: x64 NSIS installer + Portable executable
- **CI/CD Improvements**:
  - Automatic release creation on tag push (v*)
  - Cross-platform build artifacts uploaded to releases
  - Contents write permission for releases
  - Artifact filtering to only upload release packages
- **Documentation**:
  - GitHub badges in README (release, license, issues, stars)
  - Tech stack badges with versions
  - Platform badges with architecture info
  - CI/CD status badge
  - Synchronized README_zh.md with all updates
- **Security**: npm overrides to fix tar vulnerability (GHSA-8qq5-rm4j-mr97)

### Changed
- Electron Builder configuration for multi-architecture builds
- Package.json version synchronized with release tags
- Improved README layout with centered header and navigation

### Fixed
- License badge now uses static badge (GitHub API had issues)
- Windows ARM64 build removed (native module compilation issue)
- .claude/settings.local.json now tracked in git

---

## [Unreleased] - Previous versions

### Added
- Debug Console window for real-time application logging
- Color-coded log levels (info, warn, error, debug) in debug console
- Selectable and copyable log entries in debug console
- Debug Console menu item with Ctrl/Cmd+Shift+D shortcut
- Detailed debug logging for connection and tab creation processes
- Per-tab serial connection management with independent serial instances
- Connection dialog modal for creating new connections with all configuration options
- Custom tab naming support with automatic fallback to port path
- Connection status indicators (● connected, ○ disconnected) in tab titles
- Automatic serial port disconnection when closing tabs
- Per-tab terminal and input field for independent communication
- Connection dialog with port refresh functionality
- SerialServiceManager for managing multiple serial connections simultaneously
- Improved tab layout with dynamic bounds calculation to prevent window occlusion

### Changed
- Upgraded Electron from 28.1.0 to 40.0.0
- Removed serial port configuration from main toolbar
- Updated "New Tab" to "New Connection" with dialog workflow
- Tab switching now activates corresponding BrowserView with proper bounds
- All serial operations now require tabId parameter
- Menu item renamed from "New Window" to "New Connection"
- Improved window resizing to recalculate layout metrics dynamically

### Fixed
- Increased input bar padding from 10px to 15px 20px for better spacing
- Increased connection dialog height from 450px to 550px to fit all content
- Fixed tab creation to only happen after successful connection
- Fixed tab ID consistency between window manager and serial service manager
- Fixed tab:created event to use correct tabId property
- Removed deprecated remote module from connection dialog
- Replaced alert() with selectable in-page error messages

---

## [1.0.0] - 2024-01-16

### Added
- Initial release of Patterm serial terminal application
- Multi-window tab system for managing multiple serial connections
- Complete UART configuration support (baud rate, data bits, stop bits, parity, flow control)
- Real-time serial I/O with minimal latency
- File logging with manual/continuous modes
- Cross-platform support (Windows, macOS, Linux)
- Keyboard shortcuts (Ctrl/Cmd+N for new tab, Ctrl/Cmd+W to close window)
- About dialog with application information
- Comprehensive documentation in English and Chinese
- GitHub Actions CI/CD pipeline for automated builds and testing

### Technical Implementation
- Electron-based desktop application
- SerialPort.js for serial communication
- BrowserView for tab content management
- IPC communication pattern for main-renderer processes
- Custom event emitter pattern for serial services
- Responsive UI with modern CSS styling
