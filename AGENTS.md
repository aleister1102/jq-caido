# jq-caido (Caido JQ plugin)

Caido frontend plugin (Vue 3 + TypeScript) that runs `jq` via `jq-wasm`.

## Quick Reference

| Goal                  | Command           | ~Time |
| --------------------- | ----------------- | ----: |
| Install               | `bun install`     |   ~5s |
| Build                 | `bun run build`   |   ~2s |
| Watch/Dev             | `bun run watch`   |    -- |
| Package (release zip) | `bun run package` |   ~3s |

Run from repo root. `bun run package` produces `dist/plugin_package.zip` after a clean build + bundling `README.md`/`LICENSE`.

## File Map

- `caido.config.ts`: Build config (Vite + Caido plugin packaging).
- `manifest.json`: Plugin manifest (must be at zip root).
- `src/frontend/src/`: Vue UI source (view mode, components, JQ runner).
- `src/frontend/src/index.ts`: View mode registration.
- `src/frontend/src/views/JqViewMode.vue`: Main UI orchestrator.
- `src/frontend/src/lib/runJq.ts`: JQ execution wrapper.
- `scripts/`: Packaging + local performance scripts.

## Shared Utilities

| Need                | Use                                 | Location                                  |
| ------------------- | ----------------------------------- | ----------------------------------------- |
| Extract body string | `extractJsonBodyString(raw)`        | `src/frontend/src/lib/extractJsonBody.ts` |
| Run jq              | `runJq(jsonOrString, query, flags)` | `src/frontend/src/lib/runJq.ts`           |
| Query suggestions   | `getSuggestions(json, query)`       | `src/frontend/src/lib/jq-suggestion.ts`   |

## Constraints and Heuristics

### General

- Keep `strict` TypeScript on; avoid `any` except at SDK/module boundaries.
- Treat inputs as untrusted (validate/guard; use `unknown` and type guards).
- Use ESM imports; avoid Node-only APIs in frontend code.
- **Never** bundle `vue` into the plugin output; keep it externalized.

### Performance (Critical)

- **Large payloads (10MB+):** Avoid `JSON.parse` if possible; prefer raw string through `jq-wasm`.
- **Large output:** Truncate by default; avoid Prism syntax highlighting when big.
- **Debouncing:** JQ execution is debounced to avoid lag during fast typing.

### Boundaries

- **Ask first:** Before changing GraphQL fallback logic or which Caido surfaces register the view mode.
- **Never:** Add telemetry/external network calls or log full raw messages to console.

## Git and Release Workflow

- **Branching:** Use `feature/`, `fix/`, `refactor/` prefixes on `main`.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `chore:`).
- **Releasing:** Bump versions in `package.json` and `manifest.json`, commit to `main`, and run the "Release" GitHub Action. Private signing keys are handled in CI only.
