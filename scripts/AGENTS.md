# Scripts

Scope: `scripts/**`

## Scripts

| File | Purpose |
|---|---|
| `scripts/package.mjs` | Re-zips `dist/plugin_package/` so `manifest.json` is at zip root; also copies `README.md` + `LICENSE` |
| `scripts/test_jq_perf.ts` | Local jq-wasm performance benchmark helper |

## Commands (verified 2026-02-04)

Run these from the **repo root**.

| Goal | Command | Notes |
|---|---|---|
| Create release zip | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node scripts/package.mjs` | Requires `dist/plugin_package/` from build and `zip` installed |

Optional/local-only:
- Perf script: `/Users/quan.m.le/.proto/tools/bun/1.3.5/bun scripts/test_jq_perf.ts`

## Boundaries

- Never: write private keys to disk outside CI; the signing key is injected in GitHub Actions only (`.github/workflows/release.yml`).
