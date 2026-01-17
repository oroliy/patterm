# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Patterm** is a cross-platform serial terminal application built with Electron. It provides multi-tab support for managing multiple serial port connections simultaneously, similar to PuTTY or Tera Term but with modern multi-tabbed UI.

**Tech Stack**: Electron 40.0.0, Node.js 18.x/20.x, SerialPort.js 12.0.0, vanilla JavaScript (no TypeScript), Electron Builder for packaging.

## Common Commands

```bash
# Development
npm start              # Start Electron app (no hot reload)
npm run dev           # Start with hot reload using concurrently

# Building
npm run dist          # Build distribution packages for current platform
npm run dist:win      # Build for Windows (NSIS installer)
npm run dist:mac      # Build for macOS (DMG)
npm run dist:linux    # Build for Linux (AppImage + deb)

# Virtual Serial Port Testing (essential for development without hardware)
npm run test:e2e       # One-click E2E test with virtual serial port
bash scripts/create-virtual-port.sh /tmp/ttyV0    # Socat-based virtual port
bash scripts/quick-virtual-serial.sh              # Simple echo server
python3 scripts/virtual-serial.py                 # Python-based emulator
```

**For faster Electron downloads in China**:
```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## Architecture

### Multi-Process Electron Structure

```
src/
├── main/                    # Electron Main Process
│   ├── main.js             # Entry point, IPC handlers (serial:*, window:*, log:*, app:*)
│   ├── window-manager.js   # BrowserView-based multi-tab management
│   └── debug-window.js     # Debug console manager
├── renderer/               # Renderer Process (UI)
│   ├── index.html/main.js  # Main window shell
│   ├── tab.html            # Template for tab content (each tab = separate BrowserView)
│   ├── connection-dialog.* # Connection setup modal
│   └── debug-window.html   # Debug console UI
└── services/               # Business Logic (loaded by main process)
    ├── serial-service.js           # Handles single serial port operations
    └── serial-service-manager.js   # Manages multiple SerialService instances
```

### Key Architectural Patterns

**1. Multi-Tab via BrowserView**
- Each tab is a separate `BrowserView` instance with independent serial connection
- `WindowManager` handles tab lifecycle: creation, switching, cleanup
- Critical: Always call `webContents.destroy()` when removing views to prevent memory leaks

**2. Service-Oriented Design**
- `SerialService`: Encapsulates single port operations (open, close, write, event emission)
- `SerialServiceManager`: Factory and manager for multiple `SerialService` instances
- Services use custom event emitters: `on(event, callback)`, `off(event, callback)`
- Standard events: `'data'`, `'error'`, `'close'`, `'open'`

**3. IPC Communication (Promise-based)**
- Main → Renderer: `ipcMain.handle('namespace:action', handler)`
- Renderer → Main: `ipcRenderer.invoke('namespace:action', data)`
- Namespaces: `serial:*`, `window:*`, `log:*`, `app:*`
- Always validate IPC arguments in main process before processing

**4. Debug Console**
- Separate debug window with real-time logging
- Color-coded levels: info (blue), warn (yellow), error (red), debug (gray)
- Toggle with `Ctrl/Cmd + Shift + D`
- Clear logs with `Ctrl/Cmd + L`

### Code Style (from AGENTS.md)

- **CommonJS modules**: `require()` / `module.exports`
- **4 spaces**, semicolons required, single quotes
- **Naming**: Classes (PascalCase), functions/variables (camelCase), constants (UPPER_SNAKE_CASE)
- **No TypeScript**: Use JSDoc for type hints where needed
- **NO comments policy**: Code must be self-documenting through clear naming
- **Error handling**: Always try-catch async operations, throw descriptive Errors with context
- **Git**: Commit frequently with conventional commits (`feat:`, `fix:`, `docs:`), push immediately

### Serial Port Best Practices

- Always check `port.isOpen` before operations
- Use `ReadlineParser` for text-based communication
- Default config: 115200 baud, 8N1 (8 data bits, no parity, 1 stop bit)
- Close existing port before opening new one on same path
- Handle both `'data'` and `'error'` events from SerialPort

### Testing with Virtual Serial Ports

Development relies on virtual serial ports since physical hardware may not be available:

1. **Socat method** (recommended):
   ```bash
   bash scripts/create-virtual-port.sh /tmp/ttyV0
   # Connect Patterm to /tmp/ttyV0
   # Send test data: telnet localhost 12345
   ```

2. **Quick echo server**:
   ```bash
   bash scripts/quick-virtual-serial.sh
   # Connect to displayed port (e.g., /dev/pts/0)
   ```

3. **Python emulator**: Interactive virtual serial with send/receive capabilities

See `scripts/README.md` for detailed testing guide with troubleshooting.

## CI/CD

GitHub Actions (`.github/workflows/ci-cd.yml`):
- Triggers: Push to master/develop, PRs to master
- Multi-platform: Ubuntu, macOS, Windows
- Node.js 20.x
- Stages: Lint → Build → Test → Release
- Automatic releases on tags with "release:" prefix
- Uses Chinese mirror for faster Electron downloads

## Distribution Formats

- **Windows**: NSIS installer (.exe)
- **macOS**: DMG disk image (.dmg)
- **Linux**: AppImage and Debian package (.deb)

Build artifacts placed in `dist/` directory.
