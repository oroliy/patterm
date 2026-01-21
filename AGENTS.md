# AGENTS.md - Guidelines for Coding Agents

## Build Commands

```bash
# Development
npm start              # Start Electron app
npm run dev           # Start with hot reload

# Building
npm run build         # Build renderer and main
npm run dist          # Build distribution files
npm run dist:win      # Build for Windows
npm run dist:mac      # Build for macOS
npm run dist:linux    # Build for Linux

# Linting & Testing
# npm run lint          # Run linter (placeholder - no ESLint configured yet)
# npm test              # Run unit tests
# npm run test:watch    # Watch mode for tests
# npm run test:coverage # Coverage report
# npm run test:e2e      # One-click E2E test with virtual serial port

# Run single test
# npm test -- --testNamePattern="testName"

# Virtual Serial Port Testing (for manual testing)
# npm run test:e2e      # RECOMMENDED: One-click test with virtual port + app
# bash scripts/test.sh -h # Show test script options
# bash scripts/test.sh -k # Keep virtual port running after exit
# bash scripts/test.sh -c # Cleanup existing virtual ports
# bash scripts/create-virtual-port.sh /tmp/ttyV0    # Create virtual port only (Linux/macOS)
# bash scripts/quick-virtual-serial.sh         # Quick echo server (Linux/macOS)
# python3 scripts/virtual-serial.py            # Python-based virtual port (Linux/macOS)
# scripts\setup-com0com.bat                    # Windows virtual port setup
# python scripts\virtual-serial-win.py         # Windows PySerial bridge
```

## Code Style Guidelines

### Modules & Imports
- Use CommonJS: `require('module')` and `module.exports = value`
- Group imports: Built-in modules → Third-party → Local modules
- Use object destructuring for multiple imports

### Formatting
- Indentation: 4 spaces (no tabs)
- Semicolons: Required
- Quotes: Single quotes preferred
- Line length: Max 100 characters
- Trailing commas: Required in multi-line arrays/objects

### Naming Conventions
- Classes: PascalCase (e.g., `WindowManager`, `SerialService`)
- Functions/Methods: camelCase (e.g., `createMainWindow`, `openPort`)
- Variables: camelCase (e.g., `tabId`, `portConfig`)
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_BAUD_RATE`)
- Private members: Prefix with underscore (e.g., `_internalMethod()`)

### Types & Type Safety
- No TypeScript - use JSDoc for complex types
- Validate function parameters at entry points
- Use defensive programming for null/undefined checks
- Prefer explicit types over type coercion

### Error Handling
- Always use try-catch for async operations
- Throw descriptive Error objects with context
- Log errors before re-throwing
- Use specific error messages (not generic "Error occurred")
- Example:
  ```javascript
  throw new Error(`Failed to open port ${config.path}: ${error.message}`);
  ```

### Asynchronous Code
- Use async/await over callbacks
- Return Promises from async methods
- Handle promise rejections
- Use `await` in try blocks for proper error handling

### Event Handling
- Implement custom `on(event, callback)` and `off(event, callback)` for services
- Use pattern `emitData()` / `emitError()` for internal event emission
- Clean up event listeners when components destroy
- Example event types: `'data'`, `'error'`, `'close'`, `'open'`

### Electron IPC Pattern
- Main process → Renderer: `ipcMain.handle('namespace:action', handler)`
- Renderer → Main: `ipcRenderer.invoke('namespace:action', data)`
- Use consistent namespace prefixes: `serial:*`, `window:*`, `log:*`, `app:*`
- Always validate IPC arguments in main process

### Class Structure
- Use ES6 classes with constructors
- Initialize instance properties in constructor
- Keep methods focused and single-purpose
- Use `this.` consistently
- Export classes as modules: `module.exports = ClassName`

### File Organization
```
src/
├── main/           # Electron main process
│   ├── main.js     # Application entry point
│   ├── window-manager.js  # Multi-window and tab management
│   └── debug-window.js     # Debug console management
├── renderer/       # UI/frontend code
│   ├── index.html  # Main window HTML
│   ├── main.js     # Main window JavaScript
│   ├── tab.html    # Tab content HTML
│   ├── connection-dialog.html  # Connection dialog HTML
│   ├── connection-dialog.js    # Connection dialog logic
│   ├── debug-window.html     # Debug console HTML
│   ├── about.html  # About dialog HTML
│   └── styles.css  # Global CSS styles
├── services/       # Business logic
│   ├── serial-service.js  # Single serial port handling
│   └── serial-service-manager.js  # Multi-connection management
└── scripts/        # Testing and utility scripts
    ├── create-virtual-port.sh    # Virtual port creation
    ├── quick-virtual-serial.sh     # Quick echo server
    └── virtual-serial.py        # Python virtual serial
```

### NO Comments Policy
- DO NOT add comments to code unless explicitly requested
- Code should be self-documenting through clear naming
- Use meaningful variable/function names instead of explaining logic

### BrowserView Management
- Use BrowserView for tab content in multi-window apps
- Always set bounds after adding view
- Remove previous view before switching
- Clean up views on tab close: `view.webContents.destroy()`

### Serial Port Specifics
- Always check `port.isOpen` before operations
- Use ReadlineParser for text-based communication
- Default config: 115200 baud, 8 data bits, no parity, 1 stop bit
- Close existing port before opening new one
- Handle both data and error events from SerialPort

### Git Workflow
- Commit frequently with descriptive messages
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Example: `feat: implement serial port auto-reconnect`
- Commit after completing each logical unit of work
- Push to remote after each commit (don't accumulate multiple commits)
- **IMPORTANT**: Always run `npm run lint` and `npm test` before committing to verify code quality

### GitHub Actions CI/CD
- Runs on push to master and PRs
- Platforms: Ubuntu, macOS, Windows
- Node version: 20.x
- Actions: Install, lint, build, test (lint and test are placeholders)
- Uses ELECTRON_MIRROR for faster downloads in China
- Artifacts: Build artifacts retained for 7 days
- Releases: Automatic on tagged commits

### Virtual Serial Port Testing
**Linux/macOS:**
- Use `scripts/create-virtual-port.sh /tmp/ttyV0` to create virtual port
- Connect Patterm to `/tmp/ttyV0`
- Send test data via `telnet localhost 12345` or `nc localhost 12345`
- Clean up with `killall socat` after testing

**Windows:**
- Use `scripts\setup-com0com.bat` for automated com0com configuration
- Or use `python scripts\virtual-serial-win.py` for PySerial-based bridge

- Always keep Debug Console open (Ctrl+Shift+D) when testing
- See scripts/README.md for detailed testing guide

## Important Notes
- node_modules/ is gitignored - use npm ci to install
- dist/ is gitignored - build artifacts only
- Always push to remote after committing
- Check .gitignore before committing new file types
- Use ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ in China

## Documentation Requirements (CRITICAL)

When making changes to the project, you MUST keep documentation in sync:

### Files to Update Together
- **README.md** - English documentation
- **README_zh.md** - Chinese documentation (MUST mirror README.md)
- **CHANGELOG.md** - Complete version history and changes
- **CHANGELOG_LATEST.md** - Latest release highlights (for quick reference)

### When to Update Documentation
1. **Every release**: Update CHANGELOG.md with version changes AND CHANGELOG_LATEST.md with highlights
2. **Badge changes**: Update badges in BOTH README.md and README_zh.md
3. **New features**: Document in both README files and CHANGELOG_LATEST.md
4. **Configuration changes**: Update build info in both README files
5. **Test changes**: Update testing sections in both README files
6. **Context menu/IPC changes**: Update CLAUDE.md for AI agent reference

### Version Sync Requirements
- package.json version MUST match release tag (e.g., v0.3.0)
- When bumping version: `npm version <version>` before creating tag
- Delete and recreate tags if needed to sync with package.json

### Badge Best Practices
- Use static badges where possible (e.g., `license-MIT-blue.svg`)
- Avoid GitHub API badges that may fail (e.g., `github/license/*`)
- Link badges to relevant URLs for better UX
- Keep badges consistent between README and README_zh
