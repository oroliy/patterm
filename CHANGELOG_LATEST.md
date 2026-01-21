# Changelog - Version 0.5.0 (January 18, 2026)

## New Features

### Context Menus
- **Tab Right-Click Menu**: Comprehensive context menu with quick actions:
  - Close Tab - Close current tab and disconnect
  - Disconnect/Reconnect - Toggle connection without closing tab
  - Clear Screen - Clear terminal output
  - Save Output - Save terminal content to file
  - Start/Stop Logging - Toggle session logging
  - Copy All Text - Copy all terminal text to clipboard
  - Rename Tab - Change tab name
  - Show Connection Settings - View current serial configuration
- **Terminal Right-Click Menu**: Quick terminal actions:
  - Clear Screen - Clear terminal output
  - Save Output - Save terminal content to file
  - Copy All Text - Copy all terminal text to clipboard

### Enhanced Status Bar
- **Compact Configuration Display**: Serial port settings shown in compact format (e.g., `/tmp/ttyV0 @ 115200 8N1`)
- **Connection Duration**: Shows time elapsed since connection was established
- **Connection Created Time**: Displays when the connection was first created
- **Current Time**: Real-time clock display
- **Cleaner RX/TX Indicators**: Icon-only badges with animated pulse effect on data transfer

## Improvements

### User Interface
- Cleaner status bar layout with organized sections separated by visual dividers
- Animated pulse effect on RX/TX badges when data is transferred
- Improved visual hierarchy with color-coded status indicators
- Better information density - more data in less space

### Developer Experience
- Updated AGENTS.md to require lint and tests before committing
- New IPC handlers for context menu actions

---

## Version 0.4.0 Features (January 18, 2026)

### Timestamp Display
- Millisecond-precision timestamps on all serial data lines
- Format: `[HH:MM:SS.mmm]` for precise timing analysis
- Consistent timestamp color coding for easy identification

### Enhanced Newline Handling
- Proper support for CRLF (\\r\\n) line endings (Windows standard)
- Proper support for CR (\\r) line endings
- Normalized display for consistent rendering across platforms

### RX/TX Byte Counters and Rates
- Real-time byte counters for received (RX) and transmitted (TX) data
- Data rate display in bytes per second (B/s)
- Auto-scaling byte display (B, KB, MB, GB)
- Animated badges with color coding (cyan for RX, orange for TX)

### Comprehensive Status Bar
- Port name and connection status indicator
- RX/TX byte totals with auto-scaling
- Real-time data rate indicators with pulse animation
- Connection duration timer
- Created time and current time display

### Windows Virtual Serial Support
- `scripts/setup-com0com.bat` - Automated com0com configuration wizard
- `scripts/virtual-serial-win.py` - PySerial-based virtual serial bridge for Windows testing

---

## Upgrade Notes

### For Users
- Right-click on tabs or terminal to access context menus
- Status bar now shows comprehensive connection information at a glance
- Use the context menu for quick actions without memorizing keyboard shortcuts

### For Developers
- Context menu actions are handled via new IPC handlers in main process
- Status bar updates are now more efficient with consolidated update function
- See AGENTS.md for updated development workflow requirements

---

## Full Commit History

For detailed commit history, see: https://github.com/oroliy/patterm/commits/master/
