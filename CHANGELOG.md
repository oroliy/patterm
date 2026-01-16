# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
