# jq-caido (Caido JQ plugin)

Caido frontend plugin (Vue 3 + TypeScript) that runs `jq` via `jq-wasm`.

## Quick Reference

| Goal | Command |
|---|---|
| Build | `bun run build` or `npm run build` |
| Watch | `bun run watch` or `npm run watch` |
| Re-zip w/ docs | `bun run package` or `node scripts/package.mjs` |

Run from repo root. If your runtime fails (e.g. proto shims), use Node from your PATH or set it explicitly.

## Detailed Instructions

- [Commands](.agents/commands.md)
- [File map and references](.agents/file-map.md)
- [Constraints and heuristics](.agents/constraints.md)
- [Frontend](.agents/frontend.md)
- [Scripts](.agents/scripts.md)
