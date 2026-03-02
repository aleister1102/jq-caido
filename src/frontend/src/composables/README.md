# Composables

## `useRawPayload`

`useRawPayload` (`useRawPayload.ts`) normalizes inconsistent Caido prop shapes into a stable payload interface for the rest of the app.

### Key Outputs

- `rawCandidates`: collects possible raw sources from `raw`, `data`, `request`, `response`, `value`, and `item`
- `rawInfo`: picks the first non-empty source and returns `{ raw, source }`
- `selectedIds`: resolves request/response IDs used by fallback fetching in runner logic
- `bodyText`: extracts JSON body text from raw message content
- `bodyParse`: lightweight parse status/preview metadata for diagnostics
- `parsedJson`: parsed payload object used by autocomplete

### `parsedJson` Purpose

`parsedJson` exists to power query autocomplete suggestions, not to drive jq execution.

- jq execution still uses raw string payloads for performance.
- `parsedJson` is passed to `JqQueryInput` as `rootJson`.
- Suggestion logic reads `rootJson` to suggest keys/indices based on current cursor query.

### Autocomplete Caching Behavior

The project does not persist query-result caches.

- `parsedJson` acts as a transient in-memory cache of the current payload structure.
- It is updated after successful payload parse paths used for suggestions.
- It is cleared (`null`) when payload parsing fails or payload is invalid/too large.
- No historical suggestion cache or output-result cache is stored.
