# Patterm App Structure Design

## Goal

Replace the split `src/` plus root `web/` layout with an application-first structure that makes
desktop, web, and shared responsibilities explicit.

## Proposed Layout

```text
patterm/
├── apps/
│   ├── desktop/
│   │   ├── main/
│   │   ├── renderer/
│   │   └── services/
│   └── web/
│       ├── src/
│       ├── public/
│       └── tests/
├── shared/
│   ├── css/
│   └── js/
├── generated/
├── scripts/
├── tests/
└── assets/
```

## Design Decisions

1. `apps/desktop` owns Electron-specific code only: main process, renderer shell, and IPC-backed
   serial services.
2. `apps/web` owns Vite/PWA entrypoints, browser-only services, public assets, and browser E2E
   tests.
3. `shared` owns code reused by both surfaces, including the app shell, tab UI, terminal UI,
   shared styles, events, terminal helpers, workflow helpers, and serial abstractions.
4. `generated` moves out of `src/` because build metadata is an artifact, not hand-authored source.
5. Root-level tooling continues to orchestrate the repository, but every script should point at the
   new application-first paths.

## Boundary Fixes

The refactor should remove the current inverted dependency where `src/shared/js/app/AppShell.js`
imports UI and service modules from `src/web/`. Shared code must not depend on a specific app.

To fix that:

- Move reusable UI components from the current web source into `shared/js/components/`
- Move reusable app services into `shared/js/services/`
- Move debug and helper re-export modules into `shared/js/`
- Keep only browser-specific serial and file APIs inside `apps/web/src/services/`
- Keep only Electron-specific dialog and IPC providers inside `apps/desktop/`

## Compatibility Stance

This change intentionally favors a clearer long-term structure over path compatibility. Scripts,
tests, docs, CI references, and deployment paths should be updated in the same change set so the
repository is coherent immediately after the refactor.

## Verification Strategy

1. Add a repository-structure regression test that encodes the new layout and entry paths.
2. Update runtime, lint, build, and test configs to the new paths.
3. Run the structure test first, then targeted unit tests, then lint/build/test commands that are
   still feasible in the environment.
