# Scripts

Scope: `scripts/**`. Run from **repo root**. See [root AGENTS.md](../AGENTS.md) for build/watch.

## Scripts

| File | Purpose |
|---|---|
| `scripts/package.mjs` | Re-zips `dist/plugin_package/` so `manifest.json` is at zip root; copies `README.md` + `LICENSE` |
| `scripts/test_jq_perf.ts` | Local jq-wasm performance benchmark helper |

## Commands

| Goal | Command | Notes |
|---|---|---|
| Create release zip | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node scripts/package.mjs` | Requires `dist/plugin_package/` from build and `zip` installed |

Optional/local: `bun scripts/test_jq_perf.ts` (use your bun path).

## Boundaries

- Never write private keys to disk outside CI; the signing key is injected in GitHub Actions only (`.github/workflows/release.yml`).
