import { type DocEntry, parseLlms, resolveComponent } from './catalog.js'
import { type Config, docsBase, type Framework } from './config.js'
import { HttpClient } from './http.js'
import { crossFrameworkLinks } from './links.js'
import { renderApiData } from './api.js'
import { scoreEntries } from './search.js'

export interface ApiResult {
  entry: DocEntry
  source: 'api.json' | 'api.md' | 'page'
  markdown: string
}

export class DocsService {
  private readonly catalogs = new Map<Framework, Promise<DocEntry[]>>()
  private readonly apiIndex = new Map<Framework, Promise<Record<string, unknown> | null>>()

  constructor(
    private readonly config: Config,
    private readonly http: HttpClient,
  ) {}

  frameworks(): Framework[] {
    return this.config.frameworks
  }

  resolveFramework(framework?: string): Framework {
    if (framework && (this.config.frameworks as string[]).includes(framework)) {
      return framework as Framework
    }
    return this.config.defaultFramework
  }

  async getCatalog(framework: Framework): Promise<DocEntry[]> {
    let pending = this.catalogs.get(framework)
    if (!pending) {
      pending = this.http.get(`${docsBase(this.config, framework)}/llms.txt`).then((res) => {
        if (res.status !== 200) {
          throw new Error(`Failed to load catalog for ${framework} (HTTP ${res.status})`)
        }
        return parseLlms(res.body, framework, this.config.origin)
      })
      this.catalogs.set(framework, pending)
    }
    return pending
  }

  async search(framework: Framework, query: string, limit: number): Promise<DocEntry[]> {
    const entries = await this.getCatalog(framework)
    return scoreEntries(entries, query, limit)
  }

  async getPageByEntry(entry: DocEntry): Promise<string> {
    const res = await this.http.get(entry.mdUrl)
    if (res.status !== 200) {
      throw new Error(`Failed to load page ${entry.slug} (HTTP ${res.status})`)
    }
    return res.body
  }

  async getPage(framework: Framework, slugOrUrl: string): Promise<{ entry?: DocEntry; markdown: string }> {
    const entries = await this.getCatalog(framework)
    const normalizedSlug = slugOrUrl
      .replace(/^https?:\/\/[^/]+/, '')
      .replace(new RegExp(`^/${framework}/docs/`), '')
      .replace(/\/$/, '')
      .replace(/\.md$/, '')
    const entry =
      entries.find((item) => item.slug === normalizedSlug) ?? resolveComponent(entries, normalizedSlug)
    if (!entry) {
      throw new Error(`No documentation page found for "${slugOrUrl}" in ${framework}`)
    }
    return { entry, markdown: await this.getPageByEntry(entry) }
  }

  private async getApiIndex(framework: Framework): Promise<Record<string, unknown> | null> {
    let pending = this.apiIndex.get(framework)
    if (!pending) {
      pending = this.http
        .get(`${docsBase(this.config, framework)}/api.json`)
        .then((res) => (res.status === 200 ? (JSON.parse(res.body) as Record<string, unknown>) : null))
        .catch(() => null)
      this.apiIndex.set(framework, pending)
    }
    return pending
  }

  async getComponentApi(framework: Framework, component: string): Promise<ApiResult> {
    const entries = await this.getCatalog(framework)
    const entry = resolveComponent(entries, component)
    if (!entry) {
      throw new Error(`Unknown component "${component}" in ${framework}`)
    }

    const index = await this.getApiIndex(framework)
    if (index) {
      const key = Object.keys(index).find((name) => name.toLowerCase() === `c${component}`.toLowerCase() || name.toLowerCase() === component.toLowerCase())
      if (key) {
        return { entry, source: 'api.json', markdown: renderApiData(index[key]) }
      }
    }

    const apiMd = await this.http.get(`${this.config.origin}${entry.path.replace(/\.md$/, '')}/api.md`)
    if (apiMd.status === 200) {
      return { entry, source: 'api.md', markdown: apiMd.body }
    }

    const page = await this.getPageByEntry(entry)
    return { entry, source: 'page', markdown: extractApiSection(page) ?? page }
  }

  links(component: string): ReturnType<typeof crossFrameworkLinks> {
    return crossFrameworkLinks(component)
  }
}

function extractApiSection(markdown: string): string | null {
  const lines = markdown.split('\n')
  const start = lines.findIndex((line) => /^#{1,3}\s+API\b/i.test(line))
  if (start === -1) {
    return null
  }
  return lines.slice(start).join('\n').trim()
}
