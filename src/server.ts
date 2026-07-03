import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { FRAMEWORKS } from './config.js'
import type { DocsService } from './docs.js'

type TextResult = { content: { type: 'text'; text: string }[]; isError?: boolean }

function text(value: string): TextResult {
  return { content: [{ type: 'text', text: value }] }
}

function fail(error: unknown): TextResult {
  return { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true }
}

export function createServer(docs: DocsService, version: string): McpServer {
  const server = new McpServer({ name: 'coreui-docs-mcp', version })
  const frameworkArg = z.enum(FRAMEWORKS).optional().describe(`CoreUI edition. Enabled: ${docs.frameworks().join(', ')}. Defaults to the first.`)

  server.registerTool(
    'list_components',
    {
      title: 'List CoreUI documentation pages',
      description: 'List CoreUI documentation pages (components, forms, layout, utilities...) for a framework, optionally filtered by section or a substring.',
      inputSchema: {
        framework: frameworkArg,
        section: z.string().optional().describe('Filter by section header, e.g. "Components", "Forms".'),
        query: z.string().optional().describe('Substring filter over title and slug.'),
      },
    },
    async ({ framework, section, query }) => {
      try {
        const fw = docs.resolveFramework(framework)
        const entries = await docs.getCatalog(fw)
        const needle = query?.toLowerCase()
        const sectionKey = section?.toLowerCase()
        const filtered = entries.filter((entry) => {
          const matchesSection = !sectionKey || entry.section.toLowerCase() === sectionKey
          const matchesQuery = !needle || entry.title.toLowerCase().includes(needle) || entry.slug.toLowerCase().includes(needle)
          return matchesSection && matchesQuery
        })
        if (filtered.length === 0) {
          return text(`No pages found for ${fw}${section ? ` in section "${section}"` : ''}${query ? ` matching "${query}"` : ''}.`)
        }
        const lines = filtered.map((entry) => `- **${entry.title}** (\`${entry.slug}\`)${entry.description ? ` — ${entry.description}` : ''}`)
        return text(`CoreUI ${fw} — ${filtered.length} page(s):\n\n${lines.join('\n')}`)
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'search_docs',
    {
      title: 'Search CoreUI documentation',
      description: 'Search CoreUI documentation for a framework and return the best matching pages with their URLs.',
      inputSchema: {
        query: z.string().min(1).describe('Search query, e.g. "date picker range".'),
        framework: frameworkArg,
        limit: z.number().int().min(1).max(50).optional().describe('Maximum number of results (default 10).'),
      },
    },
    async ({ query, framework, limit }) => {
      try {
        const fw = docs.resolveFramework(framework)
        const results = await docs.search(fw, query, limit ?? 10)
        if (results.length === 0) {
          return text(`No results for "${query}" in ${fw}.`)
        }
        const lines = results.map((entry) => `- **${entry.title}** — ${entry.url}\n  \`${entry.slug}\`${entry.description ? ` — ${entry.description}` : ''}`)
        return text(`Top ${results.length} result(s) for "${query}" in ${fw}:\n\n${lines.join('\n')}`)
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'get_doc_page',
    {
      title: 'Get a CoreUI documentation page',
      description: 'Fetch the full Markdown of a CoreUI documentation page by slug (e.g. "components/accordion"), component name, or URL.',
      inputSchema: {
        page: z.string().min(1).describe('Page slug, component name, or full docs URL.'),
        framework: frameworkArg,
      },
    },
    async ({ page, framework }) => {
      try {
        const fw = docs.resolveFramework(framework)
        const { entry, markdown } = await docs.getPage(fw, page)
        const header = entry ? `Source: ${entry.url}\n\n` : ''
        return text(`${header}${markdown}`)
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'get_component_api',
    {
      title: 'Get CoreUI component API',
      description: 'Get the structured API (props, events, slots) for a CoreUI component. Best for React and Vue; Bootstrap components document options inline.',
      inputSchema: {
        component: z.string().min(1).describe('Component name, e.g. "Avatar", "CAvatar", or "multi-select".'),
        framework: frameworkArg,
      },
    },
    async ({ component, framework }) => {
      try {
        const fw = docs.resolveFramework(framework)
        const result = await docs.getComponentApi(fw, component)
        return text(`Source: ${result.entry.url} (${result.source})\n\n${result.markdown}`)
      } catch (error) {
        return fail(error)
      }
    },
  )

  server.registerTool(
    'get_cross_framework_links',
    {
      title: 'Get cross-framework documentation links',
      description: 'Get the documentation URLs for a component across every CoreUI framework it exists in (Angular, Bootstrap, React, Vue).',
      inputSchema: {
        component: z.string().min(1).describe('Component name, e.g. "accordion" or "CAccordion".'),
      },
    },
    async ({ component }) => {
      const found = docs.links(component)
      if (!found) {
        return text(`No cross-framework links found for "${component}".`)
      }
      const lines = Object.entries(found.links).map(([fw, url]) => `- **${fw}**: ${url}`)
      return text(`Documentation for "${found.component}":\n\n${lines.join('\n')}`)
    },
  )

  return server
}
