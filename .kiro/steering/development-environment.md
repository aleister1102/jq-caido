---
inclusion: fileMatch
fileMatchPattern: 'package.json|bun.lock|caido.config.ts|manifest.json|.github/workflows/*.yml'
---

# Development Environment

## Tooling
- Primary local workflow uses **Bun**:
  - Install: `bun install`
  - Build: `bun run build`
  - Watch: `bun run watch`
  - Package (adds docs/license): `bun run package`
- CI/release workflow uses Node 20 + `npm install` for builds; keep `npm run build` working.

## Build Outputs
- `caido-dev build` produces `dist/plugin_package.zip` and `dist/plugin_package/`.
- `scripts/package.mjs` zips `dist/plugin_package/` contents so `manifest.json` is at the zip root and includes `README.md`/`LICENSE`.

## Caido/Vite Notes
- Keep `vue` externalized in bundling configuration to avoid "double Vue" runtime issues inside Caido.
- If a dependency incorrectly detects Node inside Caido (due to `process.*`), prefer fixing via Vite `define` / configuration rather than runtime hacks in app code.
