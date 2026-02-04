---
inclusion: fileMatch
fileMatchPattern: '*.vue|*.ts|*.tsx'
---

# Frontend Standards (Vue 3 + TS)

## Vue Component Conventions
- Use `<script setup lang="ts">` for new components.
- Keep reactive state minimal; prefer `computed` for derived values.
- Avoid expensive `computed`/watchers that run on every keystroke without debouncing.

## Performance (Large Payloads)
- Avoid `JSON.parse` for large message bodies unless strictly necessary; prefer streaming raw strings into `jq-wasm`.
- Gate expensive features by size (e.g., syntax highlighting, full output rendering).
- Debounce JQ execution and avoid re-running for unrelated UI toggles unless needed.

## Error Handling
- Errors from jq execution should be surfaced as user-friendly messages and also preserved as raw stderr for debugging.
- Prefer "safe preview" patterns when displaying invalid/unvalidated JSON.

## Host Integration (Caido)
- Assume Caido surfaces may provide different prop shapes; keep the prop contract flexible with runtime guards.
- Do not rely on browser globals that may differ inside the Caido renderer environment.
