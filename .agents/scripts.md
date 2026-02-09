# Scripts

Scope: `scripts/**`. Run commands from **repo root**.

## Scripts

| File | Purpose |
|---|---|
| `scripts/package.mjs` | Re-zips `dist/plugin_package/` so `manifest.json` is at zip root; copies `README.md` + `LICENSE` |
| `scripts/test_jq_perf.ts` | Local jq-wasm performance benchmark helper |

## Commands

| Goal | Command | Notes |
|---|---|---|
| Create release zip | `bun run package` | Requires `dist/plugin_package/` from build and `zip` installed |

Optional/local: `bun scripts/test_jq_perf.ts`.

## Boundaries

- Never write private keys to disk outside CI; the signing key is injected in GitHub Actions only (`.github/workflows/release.yml`).