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
  /** Abort a request that has not responded within this many ms. */
  timeoutMs?: number
  /** Reject a response body larger than this many bytes. */
  maxBytes?: number
}

const DEFAULT_TIMEOUT_MS = 15_000
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024

export class HttpClient {
  private readonly memory = new Map<string, CacheEntry>()
  private readonly inflight = new Map<string, Promise<DocResponse>>()
  private readonly fetchImpl: typeof fetch
  private readonly userAgent: string
  private readonly timeoutMs: number
  private readonly maxBytes: number

  constructor(private readonly options: HttpClientOptions) {
    this.fetchImpl = options.fetchImpl ?? fetch
    this.userAgent = options.userAgent ?? 'coreui-docs-mcp'
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
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
      const response = await this.fetchImpl(url, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(this.timeoutMs),
      })

      if (response.status === 304 && cached) {
        const refreshed: CacheEntry = { ...cached, ts: Date.now() }
        await this.store(url, refreshed)
        return { status: cached.status, body: cached.body }
      }

      const body = await this.readBody(response, url)
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

  private async readBody(response: Response, url: string): Promise<string> {
    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > this.maxBytes) {
      throw new Error(`Response from ${url} exceeds ${this.maxBytes} bytes (content-length ${declared})`)
    }

    if (!response.body) {
      const text = await response.text()
      if (Buffer.byteLength(text) > this.maxBytes) {
        throw new Error(`Response from ${url} exceeds ${this.maxBytes} bytes`)
      }
      return text
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      if (value) {
        total += value.byteLength
        if (total > this.maxBytes) {
          await reader.cancel()
          throw new Error(`Response from ${url} exceeds ${this.maxBytes} bytes`)
        }
        chunks.push(value)
      }
    }
    return Buffer.concat(chunks).toString('utf8')
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
