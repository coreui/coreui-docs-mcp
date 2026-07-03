import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface DocResponse {
  status: number
  body: string
}

interface CacheEntry {
  ts: number
  etag: string | null
  status: number
  body: string
}

export interface HttpClientOptions {
  cacheDir: string
  ttlMs: number
  fetchImpl?: typeof fetch
  userAgent?: string
}

export class HttpClient {
  private readonly memory = new Map<string, CacheEntry>()
  private readonly inflight = new Map<string, Promise<DocResponse>>()
  private readonly fetchImpl: typeof fetch
  private readonly userAgent: string

  constructor(private readonly options: HttpClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.userAgent = options.userAgent ?? 'coreui-docs-mcp'
  }

  async get(url: string): Promise<DocResponse> {
    const running = this.inflight.get(url)
    if (running) {
      return running
    }
    const promise = this.load(url).finally(() => this.inflight.delete(url))
    this.inflight.set(url, promise)
    return promise
  }

  private async load(url: string): Promise<DocResponse> {
    const cached = this.memory.get(url) ?? (await this.readDisk(url))
    if (cached && Date.now() - cached.ts < this.options.ttlMs) {
      this.memory.set(url, cached)
      return { status: cached.status, body: cached.body }
    }

    try {
      const headers: Record<string, string> = { 'user-agent': this.userAgent }
      if (cached?.etag) {
        headers['if-none-match'] = cached.etag
      }
      const response = await this.fetchImpl(url, { headers, redirect: 'follow' })

      if (response.status === 304 && cached) {
        const refreshed: CacheEntry = { ...cached, ts: Date.now() }
        await this.store(url, refreshed)
        return { status: cached.status, body: cached.body }
      }

      const body = await response.text()
      if (response.ok) {
        const entry: CacheEntry = {
          ts: Date.now(),
          etag: response.headers.get('etag'),
          status: response.status,
          body,
        }
        await this.store(url, entry)
        return { status: entry.status, body: entry.body }
      }
      return { status: response.status, body }
    } catch (error) {
      if (cached) {
        return { status: cached.status, body: cached.body }
      }
      throw error
    }
  }

  private diskPath(url: string): string {
    const hash = createHash('sha1').update(url).digest('hex')
    return join(this.options.cacheDir, `${hash}.json`)
  }

  private async readDisk(url: string): Promise<CacheEntry | undefined> {
    try {
      const raw = await readFile(this.diskPath(url), 'utf8')
      const entry = JSON.parse(raw) as CacheEntry
      this.memory.set(url, entry)
      return entry
    } catch {
      return undefined
    }
  }

  private async store(url: string, entry: CacheEntry): Promise<void> {
    this.memory.set(url, entry)
    try {
      await mkdir(this.options.cacheDir, { recursive: true })
      await writeFile(this.diskPath(url), JSON.stringify(entry), 'utf8')
    } catch {
      // disk cache is best-effort; memory cache still applies
    }
  }
}
