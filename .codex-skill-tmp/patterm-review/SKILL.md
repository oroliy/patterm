---
name: patterm-review
description: "Risk-focused review workflow for /home/liy/project/patterm. Use when reviewing code changes, pull requests, CI or workflow edits, Electron IPC updates, shared Web/Electron behavior changes, release-documentation sync, or test coverage gaps in this repository. Prioritize concrete findings with file references, behavioral regressions, security and IPC risks, missing tests, and documentation mismatches before giving any summary."
---

# Patterm Review

Review with a bug-finding mindset, not a summarization mindset.

Read `references/review-checklist.md` before writing findings.

## Review Workflow

Inspect the changed files and route the review through the repository structure:
- `src/main/` and `src/services/` for Electron lifecycle, IPC, dialogs, serial integration, and native behavior
- `src/shared/` for logic that can silently affect both Web and Electron
- `src/web/js/` and `web/tests/` for browser UI, session restore, search, filters, and Web Serial behavior
- `.github/workflows/` and `package.json` for CI, release, and build pipeline changes

Start by looking for behavioral regressions, unsafe assumptions, and missing coverage. Do not lead with style feedback.

## What To Prioritize

Prioritize findings in this order:
- correctness bugs
- Electron IPC or file-access risks
- Web and Electron behavior drift
- release or documentation desynchronization
- missing or weak verification

Call out only issues that are materially useful. Avoid speculative nits unless they imply real maintenance or reliability risk.

## Repository-Specific Review Heuristics

If shared app-shell or tab logic changed:
- Check whether Web and Electron still behave consistently
- Check whether session restore, terminal filters, search navigation, and command palette coverage still make sense

If main-process or service code changed:
- Check IPC argument validation, returned shapes, and error handling
- Check whether renderer-visible failures surface clearly

If tests or workflows changed:
- Check whether `npm run web:test:ci`, `npm run test:electron`, or `npm run test:ci` still reflect the intended gate
- Check whether the README files and changelog files need updates

If release-facing files changed:
- Check `package.json`, `README.md`, `README_zh.md`, `CHANGELOG.md`, and `CHANGELOG_LATEST.md` for version and feature-sync drift

## Findings Format

List findings first, ordered by severity.

For each finding:
- state the impact
- cite the exact file and line
- explain the failure mode or regression path briefly

If there are no findings, say so explicitly and then mention residual risks or unverified areas.

Keep summaries short and secondary.
