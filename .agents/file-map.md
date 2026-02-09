# File Map and References

Where key config, source, and outputs live. Use golden samples and utilities instead of re-implementing.

## File Map

- `caido.config.ts` -> build config (Vite + Caido plugin packaging)
- `manifest.json` -> plugin manifest bundled into the zip
- `src/frontend/src/` -> Vue UI source (view mode + components + JQ runner)
- `src/frontend/dist/` -> build output (do not hand-edit)
- `scripts/` -> packaging + local perf script(s)
- `dist/` -> build/package output (ignored)
- `.github/workflows/release.yml` -> tag-based release pipeline

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
