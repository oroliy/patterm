## Release Checklist

Use this checklist when the task mentions release prep, version bumps, changelog work, tags, packaging, or badge updates.

### Version Alignment

- Check `package.json` first.
- Keep the package version aligned with the intended release tag, for example `0.6.0` with `v0.6.0`.
- If the user is actively bumping a version, prefer `npm version <version>` before tag creation.

### Required Documentation Sync

Update these files together for release-facing changes:
- `README.md`
- `README_zh.md`
- `CHANGELOG.md`
- `CHANGELOG_LATEST.md`

Do not update only one README unless the other is intentionally pending and that is stated explicitly.

### What To Update Where

- `CHANGELOG.md`
  Keep the complete version history and move finished work out of `Unreleased` when appropriate.

- `CHANGELOG_LATEST.md`
  Keep the latest release highlights concise and user-facing.

- `README.md` and `README_zh.md`
  Update badges, download links, version references, build outputs, testing commands, browser support, and any release-facing feature summary.

### Badge Rules

- Prefer static badges where possible.
- Keep badge style and linked destinations aligned between English and Chinese README files.
- Avoid introducing fragile API-backed badges when a static badge is sufficient.

### Packaging And Build Notes

- If packaging targets or filenames changed, update the relevant README sections.
- If release automation changed, inspect `.github/workflows/` and mention the workflow impact in the final response.

### Final Release Check

- Confirm the visible version strings are consistent.
- Confirm release links and filenames match the target version.
- Confirm both README files still mirror each other.
- Confirm changelog files describe the same release from different levels of detail.
