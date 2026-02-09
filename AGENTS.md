# jq-caido (Caido JQ plugin)

Caido frontend plugin (Vue 3 + TypeScript) that runs `jq` via `jq-wasm`.

## Quick Reference

| Goal | Command |
|---|---|
| Build | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/caido-dev build` |
| Watch | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/caido-dev watch` |
| Re-zip w/ docs | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node scripts/package.mjs` |

Run from repo root. Prefer explicit `/opt/homebrew/bin/node` if proto shims cause issues.

## Detailed Instructions

- [Commands](.agents/commands.md) — full command table and path note
- [File map and references](.agents/file-map.md) — layout, golden samples, utilities
- [Constraints and heuristics](.agents/constraints.md) — boundaries, data handling, codebase state

## Scope Index

- **Frontend:** [src/frontend/AGENTS.md](src/frontend/AGENTS.md)
- **Scripts:** [scripts/AGENTS.md](scripts/AGENTS.md)
