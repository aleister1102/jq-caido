# Commands

## Overview

All commands are run from the **repo root**. If `node`/`bun` commands panic from `~/.proto/shims/*`, prefer the explicit binaries below.

## Commands (verified 2026-02-04)

| Goal | Command | Notes | ~Time |
|---|---|---|---:|
| Build plugin package | `bun run build` | Produces `dist/plugin_package.zip` | ~2s |
| Watch/dev | `bun run watch` | Starts Vite dev server | — |
| Re-zip w/ docs | `bun run package` | Adds `README.md`/`LICENSE` into `dist/plugin_package.zip` | ~1s |
