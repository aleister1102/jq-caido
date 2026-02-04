# jq-caido (Caido JQ plugin)

This repo is a **Caido frontend plugin** (Vue 3 + TypeScript) that runs `jq` via `jq-wasm`.

## Commands (verified 2026-02-04)

| Goal | Command | Notes | ~Time |
|---|---|---|---:|
| Build plugin package | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/caido-dev build` | Produces `dist/plugin_package.zip` | ~2s |
| Watch/dev | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/caido-dev watch` | Starts Vite dev server | — |
| Re-zip w/ docs | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node scripts/package.mjs` | Adds `README.md`/`LICENSE` into `dist/plugin_package.zip` | ~1s |

If `node`/`bun` commands panic from `~/.proto/shims/*`, prefer the explicit binaries above.

## File Map

- `caido.config.ts` -> build config (Vite + Caido plugin packaging)
- `manifest.json` -> plugin manifest bundled into the zip
- `src/frontend/src/` -> Vue UI source (view mode + components + JQ runner)
- `src/frontend/dist/` -> build output (do not hand-edit)
- `scripts/` -> packaging + local perf script(s)
- `dist/` -> build/package output (ignored)
- `.github/workflows/release.yml` -> tag-based release pipeline
- `.kiro/steering/` -> higher-level project guidelines (optional context)

## Golden Samples (copy patterns from here)

| Need | Reference |
|---|---|
| Register view mode(s) | `src/frontend/src/index.ts` |
| Main UI + performance guards | `src/frontend/src/views/JqViewMode.vue` |
| JQ execution wrapper | `src/frontend/src/lib/runJq.ts` |
| Bundling constraints (Vue external) | `caido.config.ts` |

## Utilities (reuse, don't re-implement)

| Need | Use | Location |
|---|---|---|
| Extract body string | `extractJsonBodyString(raw)` | `src/frontend/src/lib/extractJsonBody.ts` |
| Run jq | `runJq(jsonOrString, query, flags)` | `src/frontend/src/lib/runJq.ts` |
| Query suggestions | `getSuggestions(json, query)` | `src/frontend/src/lib/jq-suggestion.ts` |

## Heuristics

| When | Do |
|---|---|
| Large payloads (10MB+) | Avoid `JSON.parse`; prefer raw string through jq-wasm path |
| Large output | Truncate by default; avoid Prism highlighting when big |
| Caido prop shape varies | Use runtime guards; do not assume a single prop name |

## Boundaries

- Always: keep `vue` externalized in bundling; assume request/response data is sensitive.
- Ask first: changing how GraphQL fallback fetches raw messages; changing which Caido surfaces register the view mode.
- Never: add telemetry/external network calls; log full raw messages to console; bundle Vue into the plugin output.

## Codebase State

- Version fields are not all aligned: `package.json`/`manifest.json` are `1.2.0` but `caido.config.ts` is `1.0.4` (treat as a release checklist item).

## Scope Index

- Frontend: `src/frontend/AGENTS.md`
- Scripts: `scripts/AGENTS.md`

