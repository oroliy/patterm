# Changelog - Version 0.7.1 (March 22, 2026)

## Features & Enhancements

### Tab Management & Reconnection
- **Reconnect Button**: Added a dedicated "Reconnect" button to tabs, appearing automatically when a session is disconnected.
- **Auto-Reconnect**: 
  - **Web**: Automatically finds and reconnects to authorized ports using USB VID/PID after a page refresh.
  - **Electron**: Seamlessly re-opens the same system path (e.g., `COM3`) for restored sessions.
- **Reuse Configuration**: Reconnection now attempts to use existing port settings first before falling back to the connection dialog.
- **Port Naming**: Session names now default to the selected port's identity (USB VID:PID or system path) if no name is provided.

### UI & UX Improvements
- **Horizontal Tab Scrolling**: The tab bar now supports horizontal scrolling with mouse wheel support, handling many open sessions gracefully.
- **Tab Readability**: Long tab names now use ellipsis (`...`) to prevent UI clutter, with full names visible via hover tooltips.
- **Live Status Updates**: Added a 1-second global timer to ensure that **Duration** and **Current Time** in the status bar are always up-to-date, even when no data is flowing.
- **Auto-Scroll to Active**: Switching tabs now automatically scrolls the active tab into view if it's currently hidden in the scrollable bar.
- **Multiline Send Box**: The send box now keeps pasted multiline formatting intact, auto-expands for larger payloads, and uses **Ctrl/Cmd + Enter** to send without stripping line breaks.

### Technical Fixes
- **Desktop Dev Script Simplification**: `npm run dev` now launches Electron directly, and `npm run dev:renderer` explicitly reports that the desktop app loads `src/renderer/index.html` without any standalone `localhost:3000` renderer dev server.
- **Renderer Security**: Electron desktop windows now use preload-scoped APIs with `contextIsolation: true`, and native save/export writes stay in the main process.
- **Web E2E Startup Alignment**: Unified `npm run web:test` with the Playwright web server command so the root-level script now starts Vite directly inside `web/`, keeps the target URL at `https://localhost:5173`, and shares HTTPS handling across local and CI web configs.
- **Robust Port Closure**: Refactored `WebSerialProvider` to aggressively release stream locks and ensure ports are fully closed, eliminating "Port already open" errors during reconnection.
- **IPC Data Reliability**: 
  - Fixed decoding for Node.js `Buffer` objects crossing the Electron IPC bridge.
  - Added a **50ms buffer flush timeout** to ensure partial data or data without newlines is displayed immediately instead of being stuck in the buffer.
- **Memory Optimization**: Explicitly nullified service references after tab closure to ensure proper garbage collection.
- **IPC Registration Timing**: Moved Electron IPC handler registration to app startup so reopening windows on macOS reuses the same `serial:*`, `theme:*`, `app:*`, and `dialog:*` handlers instead of registering duplicates.

## Technical Details
- Refactored `AppShell.reconnectTab` with a platform-specific `attemptAutoReconnect` hook.
- Standardized `WebSerialProvider.disconnect` to safely handle `WritableStreamDefaultWriter.releaseLock`.
- Improved automated test suite stability for `WebSerialProvider` and `TabManager` mocks.

---

## Full Commit History
For detailed commit history, see: https://github.com/oroliy/patterm/commits/master/
