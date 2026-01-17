# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-01-17

### Added
- One-click E2E test script for streamlined testing workflow
- AGENTS.md with detailed requirements and code style guidelines

### Fixed
- Corrected socat syntax for TCP listening in virtual serial port scripts
- Synchronized documentation between AGENTS.md and CLAUDE.md

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
