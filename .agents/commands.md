# Commands

All commands run from **repo root**. Use `bun` or `npm`; works on macOS and Linux. If your runtime fails (e.g. proto shims), use Node from your PATH or set it explicitly.

| Goal | Command | Notes | ~Time |
|---|---|---|---:|
| Build plugin package | `bun run build` or `npm run build` | Produces `dist/plugin_package.zip` | ~2s |
| Watch/dev | `bun run watch` or `npm run watch` | Starts Vite dev server | — |
| Re-zip w/ docs | `bun run package` or `node scripts/package.mjs` | Adds `README.md`/`LICENSE` into zip | ~1s |
