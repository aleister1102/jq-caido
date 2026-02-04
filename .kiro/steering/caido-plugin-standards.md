---
inclusion: fileMatch
fileMatchPattern: 'caido.config.ts|manifest.json|src/frontend/src/index.ts'
---

# Caido Plugin Standards

## Registration
- Register view modes for both request and response where supported (history/replay/search/sitemap).
- Use a conservative `when()` guard; only show the view mode when there is a non-empty `raw` payload.

## Bundling Constraints
- Caido provides a shared Vue runtime; ensure the plugin build does not ship its own Vue copy.
- Keep build-time shims (e.g., `process.type`) in `caido.config.ts` rather than scattered through UI code.

## Data Access
- Prefer using the provided `raw` message whenever available.
- Only fall back to Caido API fetching (GraphQL, etc.) when the host view provides truncated/raw-limited payloads.

