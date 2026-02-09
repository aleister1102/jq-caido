# Commands

## Overview

All commands are run from the **repo root**. If `node`/`bun` commands panic from `~/.proto/shims/*`, prefer the explicit binaries below.

## Commands (verified 2026-02-04)

| Goal | Command | Notes | ~Time |
|---|---|---|---:|
| Build plugin package | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/caido-dev build` | Produces `dist/plugin_package.zip` | ~2s |
| Watch/dev | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/caido-dev watch` | Starts Vite dev server | — |
| Re-zip w/ docs | `PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node scripts/package.mjs` | Adds `README.md`/`LICENSE` into `dist/plugin_package.zip` | ~1s |
