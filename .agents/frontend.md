# Frontend

Scope: `src/frontend/**`. Run commands from **repo root** (see [root AGENTS.md](../AGENTS.md)).

## Quick Reference

| Goal | Command |
|---|---|
| Build | `bun run build` or `npm run build` |
| Watch | `bun run watch` or `npm run watch` |

## Structure

- `src/` -> plugin source
  - `index.ts` -> registers view mode(s)
  - `views/JqViewMode.vue` -> main UI and execution pipeline
  - `components/JqQueryInput.vue` -> query input + suggestions UI
  - `lib/runJq.ts` -> `jq-wasm` wrapper (timeout + stderr/stdout normalization)
  - `lib/extractJsonBody.ts` -> header/body split for raw HTTP messages
  - `lib/jq-suggestion.ts` -> simple path-based autocomplete

## Performance Rules

- Prefer passing **raw body strings** into `jq-wasm` when possible.
- Debounce jq execution triggered by typing; avoid watchers that re-run jq on unrelated UI state changes.
- Avoid Prism highlighting for large outputs (keep UI responsive).

## Caido Integration Rules

- View mode `when()` must be conservative (only show when there is a non-empty `raw` payload).
- Caido surfaces may provide message data under different prop names; keep the prop contract flexible + guarded.
- GraphQL fallback is allowed only to fetch full raw messages when Caido provides headers-only data; do not cache payloads beyond the session.

## Bundling Constraints

- Do not bundle `vue` (Caido provides a shared runtime).
- If a dependency mis-detects Node due to `process.*` fields, fix via build config (`caido.config.ts`) instead of runtime hacks.