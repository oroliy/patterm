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

# Linting & Testing (add these to package.json if missing)
npm run lint          # Run ESLint
npm test              # Run Jest tests
npm run test:watch    # Watch mode for tests
npm run test:coverage # Coverage report

# Run single test (once Jest is configured)
npm test -- --testNamePattern="testName"
npm test -- path/to/test.js
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
│   ├── main.js     # Entry point
│   └── window-manager.js
├── renderer/       # UI code (TODO: implement)
├── services/       # Business logic
│   └── serial-service.js
└── public/         # Static assets
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

### GitHub Actions CI/CD
- Runs on push to master and PRs
- Tests: ubuntu-latest, macos-latest, windows-latest
- Node versions: 18.x, 20.x
- Uses ELECTRON_MIRROR for faster downloads in China
- Artifacts uploaded for 7 days
- Auto-release on tagged commits

## Important Notes
- node_modules/ is gitignored - use npm ci to install
- dist/ is gitignored - build artifacts only
- Always push to remote after committing
- Check .gitignore before committing new file types
- Use ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ in China
