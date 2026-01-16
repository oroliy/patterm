# Patterm

A professional serial terminal application built with Electron, featuring multi-window support and comprehensive UART configuration.

## Features

- **Multi-Window Tabs**: Open and manage multiple serial connections in separate tabs
- **Complete UART Configuration**:
  - Baud rates: 110 to 921600
  - Data bits: 5, 6, 7, 8
  - Stop bits: 1, 1.5, 2
  - Parity: None, Odd, Even, Mark, Space
  - Flow control: RTS/CTS, XON/XOFF
- **Real-Time Serial I/O**: Send and receive data with minimal latency
- **File Logging**: 
  - Manual logging (start/stop on demand)
  - Auto logging (continuous)
  - Timestamped entries
- **Cross-Platform**: Windows, macOS, and Linux support
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + N` - New window/tab
  - `Ctrl/Cmd + W` - Close window

## Installation

### Prerequisites

- Node.js 18.x or 20.x
- npm (comes with Node.js)

### Install Dependencies

```bash
npm install
```

For users in China, use the Electron mirror for faster downloads:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```

## Usage

### Start the Application

```bash
npm start
```

### Basic Workflow

1. **Launch the application** with `npm start`
2. **Select a serial port** from the dropdown in the toolbar
3. **Configure settings** (baud rate, data bits, etc.) if needed
4. **Click "Connect"** to open the serial port
5. **Send data** by typing in the input field and pressing Enter
6. **View received data** in the terminal window
7. **Add more tabs** with `Ctrl/Cmd + N` for additional connections
8. **Enable logging** to save serial data to a file

## Development

### Project Structure

```
patterm/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.js     # Application entry point
│   │   └── window-manager.js  # Multi-window management
│   ├── renderer/       # UI/frontend code
│   │   ├── index.html  # Main window HTML
│   │   ├── tab.html    # Tab content HTML
│   │   └── about.html  # About dialog HTML
│   ├── services/       # Business logic
│   │   └── serial-service.js  # Serial port handling
│   └── public/         # Static assets
├── .github/workflows/  # CI/CD configuration
├── package.json
└── AGENTS.md          # Development guidelines
```

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Start Electron (no hot reload)
npm start

# Build the application
npm run build

# Build distribution packages
npm run dist
npm run dist:win    # Windows only
npm run dist:mac    # macOS only
npm run dist:linux  # Linux only
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test
npm test -- --testNamePattern="testName"
```

### Linting

```bash
# Run linter
npm run lint

# Auto-fix linting issues
npm run lint -- --fix
```

### Building for Distribution

Electron Builder is configured to create platform-specific installers:

- **Windows**: NSIS installer (.exe)
- **macOS**: DMG disk image (.dmg)
- **Linux**: AppImage and Debian package (.deb)

Build artifacts are placed in the `dist/` directory.

## Contributing

We welcome contributions! Please follow these guidelines:

1. Read [AGENTS.md](./AGENTS.md) for coding standards
2. Write clear, descriptive commit messages
3. Test your changes thoroughly
4. Ensure code follows existing patterns
5. No comments in code unless explicitly requested

### Commit Message Format

Use conventional commits:

- `feat: ` - New feature
- `fix: ` - Bug fix
- `docs: ` - Documentation changes
- `refactor: ` - Code refactoring
- `test: ` - Test changes
- `chore: ` - Maintenance tasks

Example: `feat: implement serial port auto-reconnect`

## CI/CD

This project uses GitHub Actions for continuous integration:

- **Triggers**: Push to master, pull requests
- **Platforms**: Ubuntu, macOS, Windows
- **Node versions**: 18.x, 20.x
- **Actions**: Install, lint, build, test
- **Artifacts**: Build artifacts retained for 7 days
- **Releases**: Automatic on tagged commits

See `.github/workflows/ci.yml` for configuration.

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or contributions:

- Open an issue on GitHub
- Check existing documentation in AGENTS.md
- Review code examples in the repository

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Serial communication via [SerialPort.js](https://serialport.io/)
- Build system by [Electron Builder](https://www.electron.build/)
