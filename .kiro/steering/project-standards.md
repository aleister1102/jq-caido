# Project Standards (jq-caido)

This repo is a **Caido frontend plugin** (Vue 3 + TypeScript) that adds a JQ view mode powered by `jq-wasm`.

Key references:
- #[[file:package.json]]
- #[[file:manifest.json]]
- #[[file:caido.config.ts]]
- #[[file:src/frontend/src/index.ts]]

## Principles
- Prefer **correctness + performance** over cleverness; this plugin is frequently used on very large HTTP bodies.
- Avoid unnecessary parsing: prefer passing **raw strings** through the pipeline when possible (large JSON can be 10-20MB+).
- Keep UI responsive: debounce expensive work and avoid doing heavy CPU work on mount.

## TypeScript and Code Style
- Keep `strict` TypeScript on; do not introduce `any` except at module boundaries where the SDK payload is not typed.
- Prefer small, named functions (especially in `.vue` script blocks) over large inline lambdas.
- Treat inputs as untrusted: validate/guard before use (e.g., `unknown` → type guards).
- Use ESM imports and avoid Node-only APIs in frontend code.

## Dependencies and Bundling
- **Do not bundle Vue** into the plugin output; Caido provides a shared Vue runtime. Keep `vue` externalized in Vite/Rollup config.
- Be careful with packages that detect Node via `process.*`; Caido exposes some Node-like fields. If a dependency mis-detects the runtime, prefer defining safe build-time shims.

## UX Guidelines (Plugin Context)
- The message viewer can surface data under different prop names; keep compatibility with Caido surfaces (history/replay/search/sitemap).
- Large outputs should be truncated by default; provide an explicit "show full output" affordance.
- Prefer copy buttons for both query and output; avoid auto-select behaviors that fight the host UI.

## Security and Privacy
- Do not send request/response data off-box (no telemetry, no external fetches).
- If using Caido APIs (e.g., GraphQL fallback), limit queries to what’s needed and avoid caching sensitive payloads beyond the session.
- Never log raw messages at `console.*` in production paths.
