# Caido JQ Plugin

A port of the Burp Suite extension **burp-jq** to Caido. This plugin adds a "JQ" view mode to the HTTP History, Replay, Search, and Sitemap tabs, allowing you to run real `jq` queries against JSON request and response bodies with syntax highlighting.

## Features

- **Full jq compatibility**: Uses `jq-wasm` to provide the complete `jq` feature set.
- **In-pane integration**: Adds a new view mode tab directly in the message viewer.
- **Syntax Highlighting**: Beautiful JSON syntax highlighting powered by Prism.js.
- **Advanced Filtering**:
  - **Compact**: Output results in a single line.
  - **Raw**: Remove quotes from string results (useful for extracting IDs or tokens).
  - **Keys**: Quickly extract object keys by wrapping your query with `| keys`.
  - **No Nulls**: Recursively remove null values from objects.
- **Persistence**: Remembers your last query and filter settings.
- **Automatic Fallback**: If the initial message body is missing (headers only), the plugin automatically attempts to fetch the full raw message via Caido's GraphQL API.

## Usage

1. Select an HTTP request or response that contains JSON.
2. Click on the **JQ** tab in the message viewer.
3. Enter your `jq` query in the input box (e.g., `.items[0].id`).
4. Click **Filter** (or press Enter) to execute. The output is updated automatically when you toggle filter options.
5. Use **Copy Output** to grab the result or **Copy Query** to save your jq string.

## Installation

1. Install the `plugin_package.zip` from the releases page (or build it yourself).
2. Go to **Plugins** in Caido and click **Upload Plugin**.
3. Select the zip file.

## Development

1. Install dependencies:
   ```bash
   bun install
   ```
2. Build the plugin:
   ```bash
   bun run build
   ```
3. Package the plugin:
   ```bash
   bun run package
   ```

## Releasing

To publish a new version of the plugin, follow these steps:

1. **Bump Version**: Update the version in `package.json` and `manifest.json`.
   ```json
   "version": "1.0.x"
   ```
2. **Commit and Push**:
   ```bash
   git add package.json manifest.json
   git commit -m "chore: bump version to 1.0.x"
   git push origin main
   ```
3. **Create Tag**: Push a tag matching `v*` to trigger the release workflow.
   ```bash
   git tag v1.0.x
   git push origin v1.0.x
   ```
4. **Automated Release**: GitHub Actions will automatically:
   - Build the plugin.
   - Sign the package using the `PRIVATE_KEY` secret.
   - Create a new GitHub release with the signed `plugin_package.zip`.

## Credits

- Inspired by [burp-jq](https://github.com/synacktiv/burp-jq) by Synacktiv.
- Powered by [jq-wasm](https://github.com/mwilliamson/jq-wasm).
- Syntax highlighting by [Prism.js](https://prismjs.com/).

## Author

- **aleister1102**
