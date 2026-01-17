# Changelog - Version 0.3.0 (January 17, 2026)

## ✨ New Features

### Multi-Tab Interface
- **Per-Tab Serial Connections**: Manage multiple independent serial connections simultaneously with a modern multi-tab UI
- **Connection Dialog Modal**: Easy-to-use connection setup with all serial configuration options (baud rate, data bits, stop bits, parity)
- **Custom Tab Naming**: Name your connections for easy identification
- **Connection Status Indicators**: Visual ●/○ indicators show connection status at a glance (green when connected, gray when disconnected)

### Debug Console
- **Real-Time Debug Logging**: Dedicated debug console window for troubleshooting
- **Color-Coded Log Levels**: INFO (blue), WARN (yellow), ERROR (red), DEBUG (gray)
- **Toggle Shortcut**: Press `Ctrl/Cmd + Shift + D` to show/hide debug console
- **Clear Logs**: Press `Ctrl/Cmd + L` to clear the debug console

### Testing Tools
- **One-Click E2E Testing**: Run `npm run test:e2e` to launch automated testing with virtual serial ports
- **Virtual Serial Port Scripts**: Create virtual serial ports for testing without hardware
  - `scripts/create-virtual-port.sh` - Socat-based virtual port creation
  - `scripts/quick-virtual-serial.sh` - Simple echo server
  - `scripts/random-logger.sh` - Random log generator with colored output for stress testing

### Toolbar Controls
- **Disconnect Button**: Disconnect without closing the tab, with Reconnect option
- **Auto-Scroll Toggle**: Control automatic scrolling to the latest data
- **Log Button**: Start/stop session logging to file

## 🔧 Improvements

### Terminal Display
- **Colored Terminal Output**: Received data displays in cyan, transmitted data in orange
- **Text Wrapping**: Long lines now wrap properly for better readability
- **Auto-Scroll Control**: Toggle auto-scroll on/off to read historical data
- **Connection Status in Terminal**: Visual status indicator shows current connection state

### User Interface
- **Enhanced Toolbar Layout**: All controls organized in the main toolbar
- **Default Port Pre-Filled**: Connection dialog now defaults to `/tmp/ttyV0` for faster testing
- **Better Error Messages**: Selectable error text in connection dialog for easy copying
- **Improved Button States**: Buttons properly enable/disable based on connection and tab state
- **Bottom Spacing Fix**: Input bar buttons no longer obscured by window border

### Electron Upgrade
- **Upgraded to Electron 40.0.0**: Latest Electron version with improved stability and performance
- **Removed Deprecated APIs**: Cleaned up deprecated `remote` module usage

## 🐛 Bug Fixes

### Display Issues
- **Fixed Toolbar Visibility**: BrowserView now correctly calculates layout metrics before rendering
- **Fixed Tab Content Visibility**: Removed white background overlay that was hiding terminal content
- **Fixed Tab Status Display**: Increased font size (12px → 16px) for better visibility of connection indicators

### Connection Issues
- **Fixed Initial Connection Status**: Removed false "Disconnected" message when connecting
- **Fixed Reconnection**: Preserved connection configuration for easy reconnect after disconnect

### Build & CI/CD
- **Fixed Linux .deb Build**: Added author email to package.json
- **Fixed GitHub Actions**: Resolved script errors and improved artifact handling
- **Fixed Release Artifacts**: Configured to only upload installers (not intermediate files)
- **Security Fix**: Upgraded tar to version 7.5.3 to address GHSA-8qq5-rm4j-mr97

### Testing
- **Fixed Virtual Port Creation**: Corrected socat syntax for TCP listening
- **Fixed Manual Port Input**: Now allows typing custom port paths manually

## 📝 Documentation

- **Added CLAUDE.md**: Comprehensive guide for AI agents working on this codebase
- **Updated README**: Added GitHub badges and improved styling
- **Added AGENTS.md**: Project architecture and coding guidelines
- **Updated Testing Guide**: Virtual serial port testing documentation with troubleshooting

## 🔄 Refactoring

- **Simplified IPC Communication**: Cleaner data flow between main and renderer processes
- **Removed Unnecessary References**: Cleaned up redundant BrowserView references
- **Improved Debug Logging**: Enhanced logging throughout the application

## 🔨 Developer Experience

- **Jest Test Framework**: Added unit testing infrastructure with basic test cases
- **Build Variants**: Added portable and ARM64 build options (Windows ARM64 removed due to native module issues)
- **Improved Error Handling**: Better error messages and debugging capabilities

---

## Upgrade Notes

### For Users
- No migration needed - your settings and configurations are preserved
- The debug console can be toggled with `Ctrl/Cmd + Shift + D`
- Use `npm run test:e2e` for quick testing with virtual serial ports

### For Developers
- Project now uses Electron 40.0.0
- Debug window is available via `Ctrl/Cmd + Shift + D` for development
- See `CLAUDE.md` for project architecture and coding guidelines
- Virtual serial ports are recommended for development without physical hardware

---

## Full Commit History

For detailed commit history, see: https://github.com/oroliy/patterm/commits/master/
