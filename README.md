# Caido JQ Plugin

A [Caido](https://caido.io/) frontend plugin that adds a **JQ** view mode to HTTP History, Replay, Search, and Sitemap tabs. Run real `jq` queries against JSON request and response bodies with syntax highlighting and autocomplete.

Inspired by [burp-jq](https://github.com/synacktiv/burp-jq) (Synacktiv).

## Features

- **Real `jq` queries** powered by [jq-wasm](https://github.com/owenthereal/jq-wasm).
- **Autocomplete** based on your JSON structure (supports nested objects, arrays, and `[]` iterators).
- **Syntax highlighting** via [Prism.js](https://prismjs.com/) (instant for small output; lazy-loaded in chunks for large results up to the 500 KB display cap).
- **Quick filters**: Compact (`-c`), Raw (`-r`), Keys-only, and Null removal toggles.
- **Large payload support**: optimized for 20 MB+ JSON with smart truncation and debouncing.

> [!TIP]
> **Performance**: The plugin passes raw strings directly to jq-wasm instead of parsed JS objects, avoiding expensive JS/WASM boundary traversal.
>
> **Benchmark (17.77 MB JSON):**
> | Path | Time |
> |---|---|
> | `jq.raw(Object)` | ~648,891 ms |
> | `jq.raw(String)` | **~8.27 ms** |

## Relationship to [Panes](https://github.com/caido-community/Panes)

Caido's official **Panes** plugin can add custom HTTP tabs via shell commands or workflows. Its built-in jq template runs host `jq .` (fixed query, backend subprocess).

|            | Panes shell jq | This plugin (jq-caido)                   |
| ---------- | -------------- | ---------------------------------------- |
| Engine     | Host `jq`      | Browser **jq-wasm**                      |
| UX         | Passive output | Interactive query, autocomplete, toggles |
| Search tab | No             | Yes                                      |

You can import a shell-only pane preset into Panes from [`exports/jq-shell.panes.json`](exports/jq-shell.panes.json) (Panes UI: Import). If both plugins are enabled, you may see duplicate **jq** tabs on History/Replay/Sitemap.

**Deprecation:** Interactive jq lives in the personal [caido-panes](https://github.com/aleister1102/caido-panes) fork (Panes + jq-wasm). Install that plugin or import `exports/jq-interactive.panes.json` from that repo into Panes. This standalone plugin remains useful for the **Search** tab and minimal installs.

## Installation

1. Download `plugin_package.zip` from the [releases page](https://github.com/aleister1102/jq-caido/releases).
2. In Caido, go to **Plugins** and click **Upload Plugin**.
3. Select the zip file.

## Usage

1. Select an HTTP request or response containing JSON.
2. Click the **JQ** tab in the message viewer.
3. Type a `jq` query (e.g., `.data[].id`) and press **Enter** (or just type to run with debounce).
4. Use **Copy Output** or **Copy Query** to grab results.

## Source Documentation

Architecture notes were moved into source-local README files:

- [frontend architecture and flow](src/frontend/src/README.md)
- [`useRawPayload`, `parsedJson`, autocomplete caching](src/frontend/src/composables/README.md)
- [`JqQueryInput` and `modelValue` convention](src/frontend/src/components/README.md)

## Development

```bash
# Install dependencies
bun install

# Watch mode (live reload in Caido)
bun run watch

# Production build
bun run build

# Package release zip (clean build + README/LICENSE bundled)
bun run package
```

## Releasing

1. Bump `version` in `package.json`, `manifest.json`, and `caido.config.ts`.
2. Commit and push to `main`.
3. Go to **Actions** > **Release** > **Run workflow** (on `main` branch).
4. GitHub Actions builds, signs, and publishes an immutable release tagged with the version from `manifest.json`.

## Credits

- [burp-jq](https://github.com/synacktiv/burp-jq) by Synacktiv
- [jq-wasm](https://github.com/owenthereal/jq-wasm)
- [Prism.js](https://prismjs.com/)

## Author

**aleister1102**
