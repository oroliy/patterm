## Release Flow

Use this reference to keep release work consistent and narrow.

### Step 1: Identify The Target

- Confirm the intended version from the user request or repository state.
- Start with `package.json`.
- If the task mentions a tag, keep the package version aligned with `v<version>`.

### Step 2: Sync Core Documents

Inspect and update together when needed:
- `README.md`
- `README_zh.md`
- `CHANGELOG.md`
- `CHANGELOG_LATEST.md`

Use this rule of thumb:
- `CHANGELOG.md` keeps full history
- `CHANGELOG_LATEST.md` keeps the latest highlights
- README files keep user-facing install, download, feature, and testing guidance

### Step 3: Check Release Surface

If the release affects packaging or automation, inspect:
- `package.json` build targets and artifact naming
- `.github/workflows/` release and build jobs

Look for mismatches in:
- artifact names
- platform lists
- version strings
- release ordering or workflow dependencies

### Step 4: Local Verification

Run the narrowest meaningful command for the touched release surface.

Examples:
- docs-only release sync: no full test run required, but state that explicitly
- build or packaging config changes: consider the relevant build or CI command if feasible
- workflow changes: state whether local execution is realistic

### Step 5: Final Consistency Check

- Version strings are aligned
- README English and Chinese are aligned
- changelog files describe the same release at different detail levels
- release links and filenames match the target version
- any unperformed tag or publish action is called out explicitly
