# Scripts (`scripts/**`)

## Scripts

| File | Purpose |
|---|---|
| `scripts/package.mjs` | Re-zips `dist/plugin_package/` so `manifest.json` is at zip root; copies `README.md` + `LICENSE` |
| `scripts/test_jq_perf.ts` | Local jq-wasm performance benchmark helper |

## Commands

- Create release zip: `bun run package` or `node scripts/package.mjs` (requires `dist/plugin_package/` and `zip`).
- Optional: `bun scripts/test_jq_perf.ts`.

## Boundaries

- Never write private keys to disk outside CI; signing key is injected in GitHub Actions only (`.github/workflows/release.yml`).
