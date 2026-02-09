# Constraints and Heuristics

## Overview

Rules for data handling, UX, and what not to change without asking. Keeps the plugin secure and maintainable.

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

## Codebase State

- Version fields are not all aligned: `package.json`/`manifest.json` are `1.2.0` but `caido.config.ts` is `1.0.4` (treat as a release checklist item).
