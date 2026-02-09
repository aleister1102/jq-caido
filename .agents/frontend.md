# Frontend (`src/frontend/**`)

## Structure

`src/` -> plugin source: `index.ts` (registers view mode(s)), `views/JqViewMode.vue` (main UI and execution pipeline), `components/JqQueryInput.vue` (query input + suggestions), `lib/runJq.ts` (jq-wasm wrapper), `lib/extractJsonBody.ts` (header/body split), `lib/jq-suggestion.ts` (path-based autocomplete).

## Performance

- Prefer raw body strings into jq-wasm.
- Debounce jq execution on typing; avoid Prism for large outputs.

## Caido Integration

- View mode `when()` only when non-empty `raw` payload.
- Keep prop contract flexible + guarded.
- GraphQL fallback only for full raw when host gives headers-only; do not cache beyond session.

## Bundling

- Do not bundle `vue`. Fix Node mis-detection via `caido.config.ts` (define/shims), not runtime hacks.
