# Commands

## Overview

All commands are run from the **repo root**.

## Commands

| Goal                | Command           | Notes                                       | ~Time |
| ------------------- | ----------------- | ------------------------------------------- | ----: |
| Install             | `bun install`     | Install dependencies                        |   ~5s |
| Build               | `bun run build`   | Produces `dist/plugin_package.zip`          |   ~2s |
| Watch/dev           | `bun run watch`   | Rebuilds on file changes                    |    -- |
| Package release zip | `bun run package` | Clean build + bundles `README.md`/`LICENSE` |   ~3s |
