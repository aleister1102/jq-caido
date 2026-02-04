# Git Workflow (jq-caido)

## Branching
- Default branch: `main`
- Branch names:
  - Features: `feature/<short-description>`
  - Fixes: `fix/<short-description>`
  - Refactors: `refactor/<short-description>`

## Commits
Use Conventional Commits where practical:
- `feat:` user-visible features
- `fix:` bug fixes
- `perf:` performance improvements
- `refactor:` non-behavioral changes
- `docs:` documentation-only
- `chore:` tooling/build/release plumbing

## Versioning and Releases
- Tags `v*` trigger the GitHub Actions release workflow.
- Keep versions in sync when releasing:
  - `package.json` (`version`)
  - `manifest.json` (`version`)
  - `caido.config.ts` (`version`) if it is intended to be authoritative
- Release checklist:
  - Bump versions
  - `bun run build`
  - Verify `dist/plugin_package.zip` exists and installs in Caido
  - Tag: `git tag vX.Y.Z && git push origin vX.Y.Z`

## PR Hygiene
- Prefer small PRs with a clear performance impact statement when touching the JQ execution pipeline.
- If a change impacts output formatting, include before/after screenshots or short sample payloads.

