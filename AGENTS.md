# jq-caido (Caido JQ plugin)

Caido frontend plugin (Vue 3 + TypeScript) that runs `jq` via `jq-wasm`.

## Quick Reference

| Goal                  | Command           |
| --------------------- | ----------------- |
| Install               | `bun install`     |
| Build                 | `bun run build`   |
| Watch                 | `bun run watch`   |
| Package (release zip) | `bun run package` |

Run from repo root.

- `watch` sets `JQ_DEBUG=1` to enable the Debug checkbox during development.
- `package` forces a clean production build (`JQ_DEBUG=0`) before zipping.

## Detailed Instructions

- [Commands](.agents/commands.md)
- [File map and references](.agents/file-map.md)
- [Constraints and heuristics](.agents/constraints.md)
- [Frontend](.agents/frontend.md)
- [Scripts](.agents/scripts.md)
