# Constraints and Heuristics

Rules for data handling, UX, code style, and what not to change without asking.

## TypeScript and Code Style

- Keep `strict` TypeScript on; avoid `any` except at SDK/module boundaries.
- Prefer small, named functions over large inline lambdas.
- Treat inputs as untrusted (validate/guard; use `unknown` and type guards).
- Use ESM imports; avoid Node-only APIs in frontend code.

## Heuristics

| When | Do |
|---|---|
| Large payloads (10MB+) | Avoid `JSON.parse`; prefer raw string through jq-wasm path |
| Large output | Truncate by default; avoid Prism highlighting when big |
| Caido prop shape varies | Use runtime guards; do not assume a single prop name |

## Boundaries

- **Always:** keep `vue` externalized in bundling; assume request/response data is sensitive.
- **Ask first:** changing how GraphQL fallback fetches raw messages; changing which Caido surfaces register the view mode.
- **Never:** add telemetry/external network calls; log full raw messages to console; bundle Vue into the plugin output.

## Git Workflow

- **Branching:** Default branch `main`. Use `feature/`, `fix/`, `refactor/` prefixes.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `chore:`).
- **Releases:** See [README.md — Releasing](../README.md#releasing).
- **PRs:** Prefer small PRs; for JQ pipeline changes include a performance impact note; for output-formatting changes include before/after samples or screenshots.