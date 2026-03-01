# Caido JQ Plugin

A [Caido](https://caido.io/) frontend plugin that adds a **JQ** view mode to HTTP History, Replay, Search, and Sitemap tabs. Run real `jq` queries against JSON request and response bodies with syntax highlighting and autocomplete.

Inspired by [burp-jq](https://github.com/synacktiv/burp-jq) (Synacktiv).

## Features

- **Real `jq` queries** powered by [jq-wasm](https://github.com/mwilliamson/jq-wasm).
- **Autocomplete** based on your JSON structure (supports nested objects, arrays, and `[]` iterators).
- **Syntax highlighting** via [Prism.js](https://prismjs.com/).
- **Quick filters**: Compact (`-c`), Raw (`-r`), Keys-only, and Null removal toggles.
- **Large payload support**: optimized for 20 MB+ JSON with smart truncation and debouncing.
- **GraphQL fallback**: fetches full raw messages via Caido's API when only headers are provided.

> [!TIP]
> **Performance**: The plugin passes raw strings directly to jq-wasm instead of parsed JS objects, avoiding expensive JS/WASM boundary traversal.
>
> **Benchmark (17.77 MB JSON):**
> | Path | Time |
> |---|---|
> | `jq.raw(Object)` | ~648,891 ms |
> | `jq.raw(String)` | **~8.27 ms** |

## Installation

1. Download `plugin_package.zip` from the [releases page](https://github.com/aleister1102/jq-caido/releases).
2. In Caido, go to **Plugins** and click **Upload Plugin**.
3. Select the zip file.

## Usage

1. Select an HTTP request or response containing JSON.
2. Click the **JQ** tab in the message viewer.
3. Type a `jq` query (e.g., `.data[].id`) and press **Enter** or click **Filter**.
4. Use **Copy Output** or **Copy Query** to grab results.

JSON bodies can be large, and `jq` results can be even larger. This plugin implements several optimizations:

- **Output Truncation**: By default, only the first 500KB of output is rendered. Users can toggle "Show Full Output" to see the rest.
- **Syntax Highlighting Limit**: Prism.js highlighting is disabled for outputs > 100KB to prevent UI freezing.
- **Autocomplete Gating**:
  - `JSON.parse` for suggestions is skipped if the payload body exceeds 5MB.
  - Suggestion key enumeration is disabled if the root object has more than 10,000 keys.
- **Efficient Escaping**: HTML escaping is used for large outputs to avoid the overhead of complex DOM structures or highlighting.

### Performance Notes

Rendering 1MB+ of text into a single DOM element (`v-html`) can still cause a brief "Rendering" delay in the browser (usually ~100-300ms depending on the machine). This is a browser DOM insertion bottleneck rather than a JavaScript processing bottleneck. For extremely large datasets, it is recommended to use the "Show Truncated" view for general exploration.

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

1. Bump `version` in both `package.json` and `manifest.json`.
2. Commit and push to `main`.
3. Go to **Actions** > **Release** > **Run workflow** (on `main` branch).
4. GitHub Actions builds, signs, and publishes an immutable release tagged with the version from `manifest.json`.

## Credits

- [burp-jq](https://github.com/synacktiv/burp-jq) by Synacktiv
- [jq-wasm](https://github.com/pboutes/jq-wasm)
- [Prism.js](https://prismjs.com/)

## Author

**aleister1102**
