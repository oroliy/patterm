---
name: patterm-release
description: "Release workflow for /home/liy/project/patterm. Use when preparing a release, bumping a version, checking release readiness, updating changelogs, syncing README.md and README_zh.md, validating release tags against package.json, reviewing packaging targets, or verifying release-related GitHub workflows for this repository."
---

# Patterm Release

Handle release work as a consistency exercise, not only a version bump.

Read `references/release-flow.md` before making release-facing edits.

## Release Workflow

Follow this order unless the user asks for a narrower task:
1. Check `package.json` version and the intended release tag or target version.
2. Inspect `README.md`, `README_zh.md`, `CHANGELOG.md`, and `CHANGELOG_LATEST.md`.
3. Inspect release-facing scripts and workflows in `package.json` and `.github/workflows/` when packaging or automation is involved.
4. Make the smallest changes needed to bring version strings, release notes, download references, and workflow expectations back into sync.
5. State what was verified and what still needs a real release or tag operation.

## What To Check

Check these first for release work:
- `package.json`
- `README.md`
- `README_zh.md`
- `CHANGELOG.md`
- `CHANGELOG_LATEST.md`

Check these when packaging or automation changed:
- `.github/workflows/`
- Electron build configuration in `package.json`

## Default Expectations

Keep English and Chinese README files aligned.

Treat `CHANGELOG.md` as the full history and `CHANGELOG_LATEST.md` as the concise latest-release summary.

If badges, download links, build outputs, browser support, or test commands changed, update both README files.

If version references drift, fix the drift instead of documenting inconsistent values.

## Final Response

State the target version or release scope, list the files updated, and call out anything not fully verified locally, such as tag creation, publishing, or external release uploads.
