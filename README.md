# @coreui/docs-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that brings the
official **CoreUI documentation** into your AI coding tools. Ask your assistant how
to use a CoreUI component and it answers from the current docs — components, props,
events, slots, and examples — instead of stale training data.

Covers **Bootstrap (vanilla), React, Vue, and Angular**. Points at the main
component-library docs by default, and can be repointed at a standalone product's
docs (e.g. CoreUI Data Grid) via the path options below.

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

| Flag                 | Env                       | Default               | Description                                                                                                                     |
| -------------------- | ------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `--framework <list>` | `COREUI_DOCS_FRAMEWORKS`  | `bootstrap,react,vue` | Enabled editions (comma-separated). `angular` is available but off by default. The first is the default for tools.              |
| `--base-url <url>`   | `COREUI_DOCS_BASE_URL`    | `https://coreui.io`   | Origin of the CoreUI site. Override for a staging or self-hosted mirror.                                                        |
| `--base-path <tmpl>` | `COREUI_DOCS_BASE_PATH`   | `/{framework}/docs`   | Path (after the origin) where a framework's docs live; `{framework}` is substituted. Set to e.g. `/data-grid/{framework}/docs`. |
| `--docs-path <map>`  | `COREUI_DOCS_PATHS`       | —                     | Per-framework path overrides, `fw=path` comma-separated. Wins over `--base-path`; use it where a slug breaks the template.      |
| `--ttl <minutes>`    | `COREUI_DOCS_TTL_MINUTES` | `360`                 | Cache freshness window.                                                                                                         |
| —                    | `COREUI_DOCS_CACHE_DIR`   | OS cache dir          | On-disk cache location.                                                                                                         |

### CoreUI Data Grid

The Data Grid docs live under `/data-grid/…` and its vanilla edition has no
framework segment, so point the server at them like this:

```bash
npx -y @coreui/docs-mcp \
  --framework bootstrap,react,vue,angular \
  --base-path /data-grid/{framework}/docs \
  --docs-path bootstrap=/data-grid/docs
```

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
npm install
npm run lint
npm run format
npm run typecheck
npm test
npm run build
```

## License

[MIT](LICENSE) © [CoreUI](https://coreui.io)
