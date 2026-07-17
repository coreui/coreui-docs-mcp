import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { HttpClient } from '../src/http.js'

async function cacheDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'coreui-docs-mcp-http-'))
}

function response(body: string, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: new Map(Object.entries(headers)) as unknown as Headers,
    text: async () => body,
  }
}

describe('HttpClient', () => {
  it('rejects a response body larger than maxBytes', async () => {
    const fetchImpl = (async () => response('x'.repeat(100))) as unknown as typeof fetch
    const http = new HttpClient({ cacheDir: await cacheDir(), ttlMs: 60_000, maxBytes: 10, fetchImpl })

    await expect(http.get('https://coreui.io/big')).rejects.toThrow(/exceeds 10 bytes/)
  })

  it('rejects early when content-length exceeds maxBytes', async () => {
    const fetchImpl = (async () => response('short', { 'content-length': '9999' })) as unknown as typeof fetch
    const http = new HttpClient({ cacheDir: await cacheDir(), ttlMs: 60_000, maxBytes: 10, fetchImpl })

    await expect(http.get('https://coreui.io/lie')).rejects.toThrow(/content-length 9999/)
  })

  it('passes an abort signal to fetch so requests can time out', async () => {
    let received: AbortSignal | undefined
    const fetchImpl = (async (_url: string | URL, init?: RequestInit) => {
      received = init?.signal ?? undefined
      return response('ok')
    }) as unknown as typeof fetch
    const http = new HttpClient({ cacheDir: await cacheDir(), ttlMs: 60_000, fetchImpl })

    await http.get('https://coreui.io/ok')
    expect(received).toBeInstanceOf(AbortSignal)
  })
})
