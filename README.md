# Caido JQ Plugin

A [Caido](https://caido.io/) plugin package that adds an interactive **JQ** view mode to HTTP History, Replay, Search, and Sitemap tabs. It keeps `jq-wasm` for portability, adds an optional backend `jq` path for large payloads, and avoids auto-running queries when the payload would make the UI feel stuck.

Inspired by [burp-jq](https://github.com/synacktiv/burp-jq) (Synacktiv).

## Features

- Interactive `jq` queries on the bundled **jq-wasm** engine, with an optional **Native jq** engine control.
- Request and response bodies are only parsed when `Content-Type` is JSON. Other types show a full-view prompt with a **Parse anyway** button.
- Default flags: `Raw` and `No Nulls` on, `Compact` and `Keys` off.
- `jq-wasm` upgraded to `3.0.0-jq-1.8.2`, using the inline build so the packaged worker does not need to resolve a separate `.wasm` URL.
- Optional backend `jq` execution on the **Caido backend host** when `jq` is available on `PATH`.
- Autocomplete for smaller payloads, with large-payload parsing disabled before it becomes expensive.
- A readout under the output shows engine, host, input size, output size, and run time, coloring the three measurements green, amber, or red as they approach the plugin limits.
- Output copy only copies retained output, and labels truncated copies clearly.

## Engine Policy

- Auto-run is enabled only below `2,000,000` bytes.
- Autocomplete parsing is enabled only below `4,000,000` bytes.
- Non-JSON `Content-Type` bodies are skipped, and the view is covered by a **Parse anyway** prompt until you force a run.
- Syntax highlighting runs only below `400,000` output bytes.
- `stdout` is capped at `512 KiB`; `stderr` is capped at `64 KiB`.
- Inputs above `50,000,000` bytes are rejected.

For payloads at or above `2 MB`, the plugin clears stale output and waits for an explicit **Run** action. Pressing **Enter** still runs the current query immediately.

## Native jq

Native mode is optional. To enable it:

1. Install `jq` on the machine running the Caido backend.
2. Make sure `jq` is available on `PATH` for Caido's backend process.
3. Select **Native jq**.

If **Native jq** is selected and unavailable, the plugin returns a readable error instead of silently switching engines. Nothing else breaks when the host has no `jq`: the default **jq-wasm** engine is bundled with the plugin and runs in the browser.

## Relationship to [Panes](https://github.com/caido-community/Panes)

Caido's official **Panes** plugin can add custom HTTP tabs via shell commands or workflows. Its shell jq template runs host `jq` passively; this plugin keeps the interactive query UI and still covers the Search tab.

|            | Panes shell jq | This plugin |
| ---------- | -------------- | ----------- |
| Engine     | Host `jq`      | `jq-wasm` or optional backend `jq` |
| UX         | Passive output | Interactive query, autocomplete, toggles |
| Search tab | No             | Yes |

You can still import the shell-only preset from [`exports/jq-shell.panes.json`](exports/jq-shell.panes.json). No additional Caido surfaces are registered beyond the existing History, Replay, Search, and Sitemap request/response view modes.

## Installation

1. Download `plugin_package.zip` from the [releases page](https://github.com/aleister1102/jq-caido/releases).
2. In Caido, go to **Plugins** and click **Upload Plugin**.
3. Select the zip file.

## Usage

1. Open a request or response with JSON content.
2. Click the **JQ** tab.
3. Enter a query such as `.items[0:10]`.
4. For small payloads, the plugin auto-runs with debounce.
5. For payloads at or above `2 MB`, click **Run** or press **Enter**.
6. Use **Copy Query** or **Copy Output** as needed.

Large outputs render as plain text instead of Prism token spans, and capped output is labeled as truncated in both the panel metadata and the copy button.

## Benchmarking

Run the deterministic local benchmark with:

```bash
bun run benchmark
```

It generates `1 MB`, `6 MB`, and `20 MB` payloads in memory and runs two scenarios for each size:

- `.items[0:10]`
- `.`

The script prints machine, Caido, `jq`, and `jq-wasm` version information before the timing table. Results are environment-dependent and should be treated as local reference data, not guarantees.

Reference local CLI medians from runs on 2026-09-02:

- Machine: `darwin 25.6.0 arm64`, `Apple M4 Max`
- Bun: `1.4.0`
- Node: `26.3.0`
- Caido: `n/a (benchmark runs outside Caido)`
- `jq-wasm`: `jq-1.8.2`
- `jq`: `jq-1.7.1-apple`
- `20 MB` `.items[0:10]`: `jq-wasm 280.3 ms`, `native jq 257.3 ms`
- `20 MB` `.`: `jq-wasm 632.6 ms`, `native jq 1124.8 ms`

### Syntax highlighting

Highlighting is bounded by DOM cost, not by Prism. Medians of five runs in Chromium on `Apple M4 Max`, rendering jq pretty output into the plugin's scroll container, with the plain-text path as the baseline:

|Output|Prism|DOM insert|Total|Plain text|Highlight surcharge|DOM nodes|
|---:|---:|---:|---:|---:|---:|---:|
|72 KB|6.5 ms|24.2 ms|30.7 ms|7.7 ms|+23 ms|8.2 k|
|169 KB|9.2 ms|55.7 ms|64.9 ms|17.5 ms|+47 ms|19.0 k|
|266 KB|16.9 ms|88.8 ms|105.7 ms|27.5 ms|+78 ms|29.9 k|
|388 KB|31.2 ms|131.0 ms|162.2 ms|40.3 ms|+122 ms|43.5 k|
|533 KB|40.6 ms|177.2 ms|217.8 ms|55.7 ms|+162 ms|59.8 k|

With the CPU throttled 4x, the same payloads cost `293 ms` (169 KB), `446 ms` (266 KB), `633 ms` (388 KB), and `909 ms` (533 KB). Compact (`-c`) output of the same byte size lands within 10% of these numbers despite holding 40% more DOM nodes.

`JQ_HIGHLIGHT_MAX_BYTES` is therefore `400,000`: the largest size where a re-render still reads as a step rather than a stall on a slow machine. `stdout` is capped at `512 KiB`, so only outputs in the top fifth of the possible range fall back to plain text.

## Development

```bash
# Install dependencies
bun install

# Run tests
bun run test

# Build the plugin package
bun run build

# Package release zip with README.md and LICENSE
bun run package

# Run the local benchmark
bun run benchmark
```

`bun run package` produces `dist/plugin_package.zip` and bundles `README.md` plus `LICENSE` into the packaged plugin directory.

## Releasing

1. Bump `version` in `package.json`, `manifest.json`, and `caido.config.ts`.
2. Commit and push to `main`.
3. Run the GitHub Actions **Release** workflow on `main`.

## Credits

- [burp-jq](https://github.com/synacktiv/burp-jq) by Synacktiv
- [jq-wasm](https://github.com/owenthereal/jq-wasm)
- [Prism.js](https://prismjs.com/)
