# Frontend Source Architecture

This folder contains the Vue 3 frontend code for the Caido JQ view mode.

## High-Level Flow

1. `views/JqViewMode.vue` orchestrates UI state, jq execution, and settings.
2. `composables/useRawPayload.ts` normalizes Caido props and extracts JSON payload bodies.
3. `composables/useJqRunner.ts` executes jq against the active payload.
4. `components/JqQueryInput.vue` provides query input and autocomplete UI.
5. `composables/useSuggestions.ts` and `lib/jq-suggestion.ts` derive suggestions from `parsedJson`.

## Folder Map

- `components/`: reusable view components (query input, output panel, suggestion dropdown)
- `composables/`: stateful logic for payload extraction, execution, suggestions, and settings
- `lib/`: focused helpers (jq suggestion logic, extraction, clipboard, jq runner glue)
- `views/`: top-level page/view composition

## More Detailed Notes

- Composable details: [composables/README.md](composables/README.md)
- Component details: [components/README.md](components/README.md)
