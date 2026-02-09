# Caido JQ Plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A port of the Burp Suite extension [burp-jq](https://github.com/synacktiv/burp-jq) to Caido. Adds a **JQ** view mode to HTTP History, Replay, Search, and Sitemap so you can run real `jq` queries against JSON request/response bodies with syntax highlighting.

## Features

- **Real `jq` compatibility** — Full feature set via `jq-wasm`.
- **Auto-completion** — Query suggestions from your JSON structure.
- **Built-in integration** — JQ tab in Caido's message viewer.
- **Syntax highlighting** — JSON highlighting with Prism.js.
- **Quick filters** — Compact, Raw, Keys-only, Null removal.
- **Large payloads** — Optimized for big JSON (20MB+) with raw-string path and debouncing.
- **GraphQL fallback** — Fetches full raw messages via Caido API when needed.

### Performance

The plugin passes raw strings to the WebAssembly engine to avoid JS object traversal. On a 17.77 MB JSON file:

| Scenario | Time |
| --- | --- |
| `jq.raw(Object)` | ~648,891 ms |
| `jq.raw(String)` | **~8.27 ms** |
| **Improvement** | **~78,463×** |

## Installation

1. Download `plugin_package.zip` from [Releases](https://github.com/aleister1102/jq-caido/releases) (or build from source).
2. In Caido: **Plugins** → **Upload Plugin** → select the zip.

## Usage

1. Open an HTTP request or response with JSON.
2. Open the **JQ** tab in the message viewer.
3. Enter a `jq` expression (e.g. `.items[0].id`) and press **Filter** or Enter.
4. Use **Copy Output** or **Copy Query** as needed. Output updates when you change filter options.

## Development

**Requirements:** Bun or Node.js (LTS). Commands work on macOS and Linux.

```bash
bun install   # or: npm install
bun run build      # or: npm run build  → dist/plugin_package.zip
bun run package    # or: node scripts/package.mjs  → re-zip with README + LICENSE
bun run watch      # or: npm run watch  → dev server
```

## Releasing

1. **Bump version** in `package.json`, `manifest.json`, and `caido.config.ts` (e.g. `1.2.0`).
2. Commit and push, then create and push a tag:
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```
3. GitHub Actions builds, signs (using `PRIVATE_KEY`), and attaches `plugin_package.zip` to the release.

## Credits

- [burp-jq](https://github.com/synacktiv/burp-jq) (Synacktiv) — inspiration.
- [jq-wasm](https://github.com/mwilliamson/jq-wasm) — jq runtime.
- [Prism.js](https://prismjs.com/) — syntax highlighting.

## License

MIT. See [LICENSE](LICENSE) for details.

## Author

**aleister1102**
