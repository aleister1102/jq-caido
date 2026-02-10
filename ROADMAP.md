# Learning Roadmap

A structured path to understand every technology in the jq-caido codebase.

## Phase 1 -- Core Language & Runtime

| Topic | Why | Resources |
|---|---|---|
| **TypeScript** | The entire codebase is TypeScript (`strict` mode, ESNext target). You need generics, utility types, `<script setup lang="ts">` in Vue SFCs. | [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) |
| **ES Modules** | The project uses `"type": "module"` and ESM imports throughout. Understand `import`/`export`, dynamic `import()`, and how bundlers resolve modules. | [MDN ESM guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) |

## Phase 2 -- UI Framework

| Topic | Why | Resources |
|---|---|---|
| **Vue 3 Composition API** | Every component uses `<script setup>`, `ref`, `computed`, `watch`, `defineProps`, `defineEmits`. No Options API anywhere. | [Vue 3 docs -- Composition API](https://vuejs.org/guide/extras/composition-api-faq.html) |
| **Vue Single-File Components (SFCs)** | `.vue` files with `<template>`, `<script setup lang="ts">`, `<style scoped>`. | [SFC Spec](https://vuejs.org/api/sfc-spec.html) |
| **Vue Composables pattern** | The `composables/` folder (`useJqRunner`, `useSuggestions`, `useSettings`, etc.) extracts reusable stateful logic. This is the central architectural pattern. | [Composables guide](https://vuejs.org/guide/reusability/composables.html) |

## Phase 3 -- Build Tooling

| Topic | Why | Resources |
|---|---|---|
| **Vite** | The underlying bundler. `caido.config.ts` passes Vite options (plugins, `define`, `rollupOptions.external`). Understand dev server, HMR, and production builds. | [Vite docs](https://vite.dev/guide/) |
| **Rollup** | Vite uses Rollup for production. The config marks `vue` as external (Caido provides it at runtime). Understand `external` and output formats. | [Rollup docs](https://rollupjs.org/) |
| **Bun** | Package manager and script runner (`bun install`, `bun run build`). Drop-in replacement for Node/npm in this project. | [Bun docs](https://bun.sh/docs) |

## Phase 4 -- Caido Plugin SDK

| Topic | Why | Resources |
|---|---|---|
| **Caido plugin model** | Understand `manifest.json` (plugin kind, entrypoint), how `init(caido)` is called, and the lifecycle. | [Caido plugin docs](https://docs.caido.io/concepts/plugins/introduction.html) |
| **`@caido/sdk-frontend`** | The SDK provides `caido.httpHistory`, `caido.replay`, `caido.search`, `caido.sitemap` surfaces with `addRequestViewMode` / `addResponseViewMode`. The `when` predicate controls visibility. | SDK types in `node_modules/@caido/sdk-frontend` |
| **`@caido-community/dev`** | Wraps Vite with Caido-specific defaults. Provides `caido-dev build` and `caido-dev watch` commands configured via `defineConfig` in `caido.config.ts`. | [caido-community/dev repo](https://github.com/caido-community/dev) |
| **Caido GraphQL API** | `caido.graphql.request({ id })` and `caido.graphql.response({ id })` fetch full raw HTTP messages as a fallback when only headers are provided. | Caido SDK types |

## Phase 5 -- Domain Libraries

| Topic | Why | Resources |
|---|---|---|
| **jq (the language)** | The plugin runs `jq` queries. You need to know jq syntax: `.field`, `.[0]`, `[]`, pipes, `-c`, `-r` flags, `keys`, `del(..\|nulls)`. | [jq manual](https://jqlang.github.io/jq/manual/) |
| **jq-wasm** | WebAssembly port of jq. Used via `jq.raw(jsonString, query, flags)`. The key insight: passing a raw string is ~78,000x faster than a parsed JS object. | [jq-wasm repo](https://github.com/nicolo-ribaudo/jq-wasm) |
| **Prism.js** | Syntax highlighting for JSON output. Used as `Prism.highlight(text, Prism.languages.json, "json")`. Output is capped at 100 KB for highlighting, 500 KB for display. | [Prism.js docs](https://prismjs.com/) |

## Phase 6 -- Testing

| Topic | Why | Resources |
|---|---|---|
| **Vitest** | Test runner (Jest-compatible API). Config in `vitest.config.ts` uses `jsdom` environment and Vue plugin. | [Vitest docs](https://vitest.dev/) |
| **@vue/test-utils** | Mounting and interacting with Vue components in tests. Available as a devDependency. | [Vue Test Utils docs](https://test-utils.vuejs.org/) |

## Phase 7 -- CI/CD & Packaging

| Topic | Why | Resources |
|---|---|---|
| **GitHub Actions** | `.github/workflows/release.yml` triggers on tags, builds, signs with `PRIVATE_KEY`, and attaches the zip to a GitHub Release. | [GitHub Actions docs](https://docs.github.com/en/actions) |
| **`scripts/package.mjs`** | Copies `README.md` + `LICENSE` into `dist/plugin_package/` and zips it. Standard Node `fs`/`child_process` usage. | Read the script directly |

## Suggested Reading Order Through the Source

1. `manifest.json` -- what the plugin declares to Caido
2. `caido.config.ts` -- how the build is configured
3. `src/frontend/src/index.ts` -- entry point, view mode registration
4. `src/frontend/src/views/JqViewMode.vue` -- main UI orchestrator
5. `src/frontend/src/composables/useJqRunner.ts` -- core execution pipeline
6. `src/frontend/src/lib/runJq.ts` -- jq-wasm wrapper
7. `src/frontend/src/composables/useSuggestions.ts` + `lib/jq-suggestion.ts` -- autocomplete
8. `src/frontend/src/components/` -- individual UI pieces
9. `scripts/` -- packaging and benchmarks
