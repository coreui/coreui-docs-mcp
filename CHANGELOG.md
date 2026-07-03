# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - Unreleased

### Added

- Initial release: a Model Context Protocol server for CoreUI documentation,
  covering Bootstrap (vanilla), React, and Vue.
- Tools: `list_components`, `search_docs`, `get_doc_page`, `get_component_api`,
  and `get_cross_framework_links`.
- Live content from `coreui.io` via the `llms.txt` catalog and per-page Markdown,
  with in-memory and on-disk caching (ETag revalidation, configurable TTL).
- Structured component API (props, events, slots) from the docs `api.json`
  endpoint, with a rendered `api.md` fallback for editions that predate it.
- Cross-framework documentation links bundled from `@coreui/internal-links`.
- Configuration via flags/env: `--framework`, `--base-url`, `--ttl`, and
  `COREUI_DOCS_CACHE_DIR`.
