# @coreui/docs-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that brings the
official **CoreUI documentation** into your AI coding tools. Ask your assistant how
to use a CoreUI component and it answers from the current docs — components, props,
events, slots, and examples — instead of stale training data.

Covers **Bootstrap (vanilla), React, and Vue**. Angular is coming.

The server reads the live documentation from `coreui.io` on demand and caches it
locally, so it always reflects the deployed docs without an update.

## Usage

Runs over stdio via `npx` — no install required.

```bash
npx @coreui/docs-mcp --framework react
```

### Claude Code

```bash
claude mcp add coreui-docs -- npx -y @coreui/docs-mcp --framework react
```

### Claude Desktop / Cursor / Windsurf / VS Code

Add to the MCP servers config (`claude_desktop_config.json`, `.cursor/mcp.json`,
`.vscode/mcp.json`, …):

```json
{
  "mcpServers": {
    "coreui-docs": {
      "command": "npx",
      "args": ["-y", "@coreui/docs-mcp", "--framework", "react"]
    }
  }
}
```

## Configuration

| Flag                 | Env                       | Default               | Description                                                             |
| -------------------- | ------------------------- | --------------------- | ----------------------------------------------------------------------- |
| `--framework <list>` | `COREUI_DOCS_FRAMEWORKS`  | `bootstrap,react,vue` | Enabled editions (comma-separated). The first is the default for tools. |
| `--base-url <url>`   | `COREUI_DOCS_BASE_URL`    | `https://coreui.io`   | Documentation origin.                                                   |
| `--ttl <minutes>`    | `COREUI_DOCS_TTL_MINUTES` | `360`                 | Cache freshness window.                                                 |
| —                    | `COREUI_DOCS_CACHE_DIR`   | OS cache dir          | On-disk cache location.                                                 |

## Tools

| Tool                        | Description                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `list_components`           | List documentation pages for a framework, optionally filtered by section or substring. |
| `search_docs`               | Search the docs and return the best matching pages with URLs.                          |
| `get_doc_page`              | Fetch the full Markdown of a page by slug, component name, or URL.                     |
| `get_component_api`         | Structured API (props/events/slots) for a component. Best for React and Vue.           |
| `get_cross_framework_links` | Documentation URLs for a component across every CoreUI framework.                      |

## Development

```bash
yarn install
yarn lint
yarn format
yarn typecheck
yarn test
yarn build
```

## License

[MIT](LICENSE) © [CoreUI](https://coreui.io)
