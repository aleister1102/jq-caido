# Frontend Structure

## Overview

Plugin source lives under `src/`. Entry and key modules below.

## Structure

- `src/` -> plugin source
  - `index.ts` -> registers view mode(s)
  - `views/JqViewMode.vue` -> main UI and execution pipeline
  - `components/JqQueryInput.vue` -> query input + suggestions UI
  - `lib/runJq.ts` -> `jq-wasm` wrapper (timeout + stderr/stdout normalization)
  - `lib/extractJsonBody.ts` -> header/body split for raw HTTP messages
  - `lib/jq-suggestion.ts` -> simple path-based autocomplete
