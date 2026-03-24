# Patterm Project Overview

**Patterm** is a professional serial terminal application built with Electron. It allows for managing multiple serial connections in independent tabs and provides complete UART configuration. It also features a Progressive Web App (PWA) version utilizing the Web Serial API.

## Main Technologies
- **Runtime & Frameworks:** Node.js, Electron
- **Frontend Build Tool:** Vite
- **Testing:** Jest (Unit), Playwright (E2E)
- **Serial Communication:** SerialPort.js (Desktop), Web Serial API (Web)

## Architecture
- **Main Process (`src/main/`):** Handles application lifecycle, window management, and native system integrations.
- **Renderer Process (`src/renderer/`):** Contains the UI and frontend logic for the Electron desktop application.
- **Services (`src/services/`):** Business logic for serial port operations and multi-connection management.
- **Shared (`src/shared/`):** Code shared between the desktop (Electron) and web (PWA) versions, including CSS, utilities, and serial abstractions.
- **Web App (`src/web/` & `web/`):** Source code and build configuration for the standalone Progressive Web App version.

## Building and Running

### Desktop Application
*   **Start the application:** `npm start`
*   **Start in development mode (hot reload):** `npm run dev`
*   **Build distribution packages:** `npm run dist` (Use `npm run dist:win`, `npm run dist:mac`, or `npm run dist:linux` for specific platforms).

### Web Version (PWA)
*   **Start dev server:** `npm run web:dev` (Runs on HTTPS, localhost:5173)
*   **Build for production:** `npm run web:build`
*   **Preview production build:** `npm run web:preview`
*   **Serve with HTTPS:** `npm run web:serve`

### Testing
*   **Run unit tests:** `npm test`
*   **Run quick E2E test (with virtual serial port):** `npm run test:e2e`
*   **Run Electron E2E tests:** `npm run test:electron`
*   **Run Web E2E tests:** `npm run web:test`
*   **Run full local CI gate:** `npm run test:ci` (includes lint, unit, web, and Electron tests)

### Linting
*   **Check for linting errors:** `npm run lint`

## Development Conventions

*   **Coding Standards:** Follow the guidelines specified in `AGENTS.md`.
*   **Code Comments:** Do not leave comments in the code unless explicitly requested.
*   **Commit Messages:** Use conventional commits format (e.g., `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
*   **Testing Requirement:** CI enforces four stages before build and deploy: `lint`, `unit-test`, `web-test`, and `electron-test`. Ensure all tests pass locally using `npm run test:ci` before pushing.
