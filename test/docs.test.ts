import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { loadConfig } from '../src/config.js'
import { DocsService } from '../src/docs.js'
import { HttpClient } from '../src/http.js'

const LLMS = `# CoreUI React.js documentation

> UI components.

## Components

- [Avatar](/react/docs/components/avatar.md): Circular user profile pictures.
`

const PAGE = `# React Avatar Component

## API

- [<CAvatar />](./api/#cavatar)
`

const API_MD = `# React Avatar Component API

## CAvatar

### Props

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| \`color\` | \`string\` | - | Sets the color. |
`

function fakeFetch(routes: Record<string, { status?: number; body: string }>): typeof fetch {
  return (async (input: string | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    const match = routes[url]
    const status = match?.status ?? (match ? 200 : 404)
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: new Map<string, string>() as unknown as Headers,
      text: async () => match?.body ?? 'Not found',
    }
  }) as unknown as typeof fetch
}

async function makeService(routes: Record<string, { status?: number; body: string }>): Promise<DocsService> {
  const cacheDir = await mkdtemp(join(tmpdir(), 'coreui-docs-mcp-test-'))
  const config = loadConfig(['--framework', 'react'], { COREUI_DOCS_CACHE_DIR: cacheDir } as NodeJS.ProcessEnv)
  const http = new HttpClient({ cacheDir, ttlMs: 60_000, fetchImpl: fakeFetch(routes) })
  return new DocsService(config, http)
}

describe('DocsService', () => {
  const base = 'https://coreui.io/react/docs'

  it('lists catalog entries from llms.txt', async () => {
    const docs = await makeService({ [`${base}/llms.txt`]: { body: LLMS } })
    const entries = await docs.getCatalog('react')
    expect(entries.map((entry) => entry.slug)).toContain('components/avatar')
  })

  it('fetches a page by component name', async () => {
    const docs = await makeService({
      [`${base}/llms.txt`]: { body: LLMS },
      [`${base}/components/avatar.md`]: { body: PAGE },
    })
    const { entry, markdown } = await docs.getPage('react', 'CAvatar')
    expect(entry?.slug).toBe('components/avatar')
    expect(markdown).toContain('React Avatar Component')
  })

  it('falls back to <slug>/api.md when api.json is absent', async () => {
    const docs = await makeService({
      [`${base}/llms.txt`]: { body: LLMS },
      [`${base}/api.json`]: { status: 404, body: '' },
      [`${base}/components/avatar/api.md`]: { body: API_MD },
    })
    const result = await docs.getComponentApi('react', 'avatar')
    expect(result.source).toBe('api.md')
    expect(result.markdown).toContain('| `color` |')
  })

  it('uses api.json when available', async () => {
    const apiJson = JSON.stringify({
      CAvatar: { name: 'CAvatar', props: [{ name: 'color', type: 'string', description: 'Sets the color.' }] },
    })
    const docs = await makeService({
      [`${base}/llms.txt`]: { body: LLMS },
      [`${base}/api.json`]: { body: apiJson },
    })
    const result = await docs.getComponentApi('react', 'avatar')
    expect(result.source).toBe('api.json')
    expect(result.markdown).toContain('### Props')
  })
})
