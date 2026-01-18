# Patterm TODO - Status Bar Issues

## User Reported Issues

### 1. Status Bar Positioning Problem
- **Issue**: Status bar located at the bottom of tab pages exceeds the bottom border
- **Current State**: Status bar is being cut off or overlapping with window edges
- **Location**: `src/renderer/tab.html` - `.tab-status-bar` CSS
- **Root Cause**: BrowserView height calculation issue in `src/main/window-manager.js`

### 2. Status Bar Visual Issues  
- **Issue**: Status bar left/right sides don't touch borders, looks abrupt
- **Alternative**: Remove background to make it blend better
- **Current State**: Has padding: `4px 8px` and background: `#1a1a1a`
- **Location**: `src/renderer/tab.html` lines 185-186
- **Attempted Fix**: Removed padding and background but still not optimal

### 3. Status Bar Not Updating Promptly
- **Issue**: Status bar data (rates, etc.) not updating in real-time
- **Current State**: Only updates every 1 second via `setInterval(updateRates, 1000)`
- **Location**: `src/renderer/tab.html` - `appendData()` function around lines 469-509
- **Root Cause**: Rate calculation only updates on 1-second interval, not on data arrival
- **Attempted Fix**: Added `updateStatusBar()` call after data append and modified rate calculation logic

## Additional Issues Discovered

### 4. Debug/Test CSS Leftovers
- **Issue**: Temporary debug CSS styling still present in code
- **Examples**: `background-color: blue`, `border: 3px solid green` in `.main-content`
- **Location**: `src/renderer/tab.html` lines 203-205
- **Status**: Partially cleaned up but may still have remnants

### 5. Excessive Debug Logging
- **Issue**: Window load event has extensive debug logging with periodic intervals
- **Location**: `src/renderer/tab.html` `window.addEventListener('load', ...)` lines 602-621
- **Impact**: Performance overhead, clutters debug output
- **Status**: Cleaned up in latest changes

### 6. Layout Metrics Confusion ✅ RESOLVED
- **Issue**: Code references `.main-status-bar` which doesn't exist in index.html
- **Location**: `src/main/window-manager.js` line 295, `src/renderer/styles.css` line 300
- **Impact**: `statusBarHeight` variable is calculated but main window has no status bar
- **Root Cause**: Inconsistency between code expectation and actual UI structure
- **Resolution**: Removed all references to `.main-status-bar`, simplified layout metrics to only track toolbar and tabs

## Files Affected

- `src/main/window-manager.js` - BrowserView bounds calculation
- `src/renderer/tab.html` - Status bar CSS and rate update logic
- `src/renderer/styles.css` - Global styles including non-existent main-status-bar styles
- `src/renderer/index.html` - Main window structure (missing main status bar)

## Testing Notes

- Test with virtual serial port: `bash scripts/create-virtual-port.sh /tmp/ttyV0`
- Keep Debug Console open (Ctrl+Shift+D) when testing
- Monitor status bar positioning and real-time updates
