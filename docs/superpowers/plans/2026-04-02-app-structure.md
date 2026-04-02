# App Structure Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the split `src/` plus root `web/` layout with `apps/desktop`, `apps/web`,
`shared`, and `generated`, while keeping the project runnable.

**Architecture:** Desktop-specific code moves under `apps/desktop`, browser-specific code moves
under `apps/web`, and reusable UI/business logic moves into `shared`. Root tooling remains at the
repository top level, but every runtime/build/test/doc reference is updated to the new paths in the
same refactor.

**Tech Stack:** Electron, Vite, Playwright, Jest, CommonJS and ESM JavaScript

---

### Task 1: Lock The New Structure In Tests

**Files:**
- Create: `tests/repository-structure.test.js`

- [ ] Step 1: Write a failing structure test for the new `apps/` and `shared/` layout.
- [ ] Step 2: Run only the new structure test and verify it fails against the old layout.

### Task 2: Move Source Into The New Topology

**Files:**
- Modify: `package.json`
- Modify: `scripts/generate-build-meta.js`
- Modify: `scripts/lint.js`
- Modify: `playwright.electron.config.js`
- Move: `src/main` -> `apps/desktop/main`
- Move: `src/renderer` -> `apps/desktop/renderer`
- Move: `src/services` -> `apps/desktop/services`
- Move: `src/generated` -> `generated`
- Move: `web` -> `apps/web`
- Move: reusable modules from `src/web/js` into `shared/js`
- Move: reusable styles from `src/web/css` into `shared/css`
- Move: `src/shared` -> `shared`

- [ ] Step 1: Move desktop, web, shared, and generated files into the new directories.
- [ ] Step 2: Update imports and runtime entrypoints to the new paths.
- [ ] Step 3: Remove obsolete wrapper paths so shared code no longer depends on app-specific files.

### Task 3: Update Tests, CI References, And Docs

**Files:**
- Modify: `tests/**/*`
- Modify: `electron-tests/**/*`
- Modify: `README.md`
- Modify: `README_zh.md`
- Modify: `CHANGELOG.md`
- Modify: `CHANGELOG_LATEST.md`
- Modify: `AGENTS.md`
- Modify: `CLAUDE.md`
- Modify: `GEMINI.md`
- Modify: `.github/workflows/*.yml`
- Modify: `.gitignore`

- [ ] Step 1: Update tests and transformers to load modules from the new paths.
- [ ] Step 2: Update docs and agent guidance to describe the new structure.
- [ ] Step 3: Update CI/deploy path references and ignored generated artifact directories.

### Task 4: Verify The Refactor

**Files:**
- Verify only

- [ ] Step 1: Run the repository-structure test and targeted unit tests for moved modules.
- [ ] Step 2: Run `npm run lint`.
- [ ] Step 3: Run `npm test`.
- [ ] Step 4: Run `npm run web:build`.
- [ ] Step 5: Report any remaining verification gaps explicitly.
