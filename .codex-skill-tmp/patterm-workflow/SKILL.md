---
name: patterm-workflow
description: "Repository-specific workflow for /home/liy/project/patterm. Use when working on this Electron + Web serial terminal codebase to apply its required habits: inspect dirty git state first, preserve user changes, route work across Electron main/renderer/shared/web layers correctly, run the right Jest or Playwright commands, and keep README.md, README_zh.md, CHANGELOG.md, and CHANGELOG_LATEST.md in sync when features, releases, badges, or testing instructions change."
---

# Patterm Workflow

Apply the repository's expected workflow without waiting for the user to restate it. Prefer doing the next obvious repository-specific step when it is low risk.

Read `references/verification-matrix.md` when deciding which commands and documentation updates match the touched files.
Read `references/task-triggers.md` when the user request is short or ambiguous and you need to infer the likely repository workflow from the wording.
Read `references/release-checklist.md` when the task mentions release prep, version bumps, tags, badges, packaging, or changelog updates.

## Start Each Task

Inspect `git status --short` before editing.

Treat existing unrelated changes as user work. Do not revert or reformat them. Avoid files under `.github/` unless the task is explicitly about CI, automation, or review workflows.

Read only the files needed to understand the active change. Prefer these entry points:
- `src/main/main.js` for Electron app lifecycle, menus, IPC, and theme broadcast
- `src/services/` for Node serial behavior
- `src/renderer/` for Electron renderer UI
- `src/shared/` for logic shared by Electron and Web
- `src/web/js/` for Web Serial and PWA behavior
- `web/tests/` for browser E2E coverage

## Route The Task

Choose the work path that matches the touched area.

If the task touches Electron main process, IPC, file dialogs, menus, or native theme handling:
- Inspect `src/main/` and `src/services/`
- Validate IPC argument flow and error handling
- Check whether the Web path also needs parallel behavior in shared code

If the task touches terminal behavior, tabs, filters, search, command palette, session restore, or theme UX:
- Start in `src/shared/js/app/AppShell.js`
- Follow the flow into `src/web/js/components/`, `src/web/js/services/`, and `src/renderer/`
- Prefer fixing shared logic once instead of diverging Web and Electron behavior

If the task touches browser serial support or PWA behavior:
- Inspect `src/web/js/main.js`, `src/web/js/services/SerialService.js`, and `web/public/`
- Remember Web Serial requires a compatible Chromium browser and HTTPS or localhost

If the task touches GitHub workflows or CI:
- Inspect `.github/workflows/` and `package.json`
- Prefer `npm run test:ci` as the target local gate when feasible

Use the verification matrix to map changed files to the minimum acceptable test command and the likely documentation set.

## Run The Right Verification

Pick the narrowest command that proves the change.

For shared logic or non-UI logic:
- Run `npm test` when unit coverage exists for the touched area

For Web UI changes:
- Run `npm run web:test:ci`

For Electron behavior or cross-surface integration:
- Run `npm run test:electron`

For CI-sensitive or release-sensitive changes:
- Run `npm run test:ci` when dependencies and environment allow it

If a full test run is not feasible, state exactly what was not run and why.

## Keep Documentation In Sync

Apply the repository's documentation rule automatically.

Update all of these together when the change affects features, releases, badges, configuration, testing instructions, or user workflow:
- `README.md`
- `README_zh.md`
- `CHANGELOG.md`
- `CHANGELOG_LATEST.md`

Mirror English and Chinese README content. Do not update only one unless the other is intentionally pending and that is stated clearly.

If versioning or release packaging changes:
- Check `package.json` version
- Keep release references aligned with the version

If context menus, IPC contracts, or agent-facing workflow assumptions change:
- Check whether `CLAUDE.md` also needs an update

## Preserve Repository Conventions

Use CommonJS in Electron and service code unless the file already uses ESM.

Keep formatting aligned with the repository:
- 4 spaces
- semicolons required
- single quotes preferred
- trailing commas in multiline objects and arrays

Do not add comments unless the user asks or the code is unusually hard to follow.

## Be Proactive In The Right Way

After understanding the task, do the next obvious repository-specific action without asking when risk is low:
- inspect the corresponding test file
- update mirrored docs when behavior changed
- mention unrun verification explicitly
- flag Electron or IPC security implications
- call out mismatches between Web and desktop implementations

Do not expand scope into unrelated refactors, dependency upgrades, or cleanup passes.

## Final Response

Summarize the actual repository impact, verification performed, and any remaining gaps.

When relevant, mention the exact commands run and whether documentation sync was handled.
