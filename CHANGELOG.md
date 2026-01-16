# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-01-16

### Added
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
- Removed serial port configuration from main toolbar
- Updated "New Tab" to "New Connection" with dialog workflow
- Tab switching now activates corresponding BrowserView with proper bounds
- All serial operations now require tabId parameter
- Menu item renamed from "New Window" to "New Connection"
- Improved window resizing to recalculate layout metrics dynamically

### Technical Implementation
- Added SerialServiceManager class to manage multiple SerialService instances
- Implemented connection dialog with form validation and loading states
- Enhanced WindowManager with layout metric calculation for proper tab positioning
- Updated IPC handlers to support tab-based serial operations
- Added connection dialog HTML and JavaScript for user-friendly configuration
- Improved data routing to send serial data to correct tab's BrowserView
- Fixed tab display issues by calculating actual toolbar and tabs container heights
- Each tab now maintains its own serial connection and data context

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
