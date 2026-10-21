import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'

import { loadConfig } from '../src/config.js'
import { DocsService } from '../src/docs.js'
import { HttpClient } from '../src/http.js'
import { createServer } from '../src/server.js'

const BASE = 'https://coreui.io/react/docs'

const ROUTES: Record<string, string> = {
  [`${BASE}/llms.txt`]: `# CoreUI React.js documentation

## Forms

- [Multi Select](/react/docs/forms/multi-select.md): (PRO) Pick several options.

## Components

- [Avatar](/react/docs/components/avatar.md): Circular user profile pictures.
`,
  [`${BASE}/api.json`]: JSON.stringify({ CMultiSelect: { name: 'CMultiSelect', props: [] } }),
}

const fakeFetch = (async (input: string | URL) => {
  const body = ROUTES[typeof input === 'string' ? input : input.toString()]
  const status = body === undefined ? 404 : 200
  return { ok: status === 200, status, headers: new Map() as unknown as Headers, text: async () => body ?? 'Not found' }
}) as unknown as typeof fetch

async function connect(): Promise<Client> {
  const cacheDir = await mkdtemp(join(tmpdir(), 'coreui-docs-mcp-test-'))
  const config = loadConfig(['--framework', 'react'], { COREUI_DOCS_CACHE_DIR: cacheDir } as NodeJS.ProcessEnv)
  const docs = new DocsService(config, new HttpClient({ cacheDir, ttlMs: 60_000, fetchImpl: fakeFetch }))
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await createServer(docs, '0.0.0').connect(serverTransport)
  const client = new Client({ name: 'test', version: '0.0.0' })
  await client.connect(clientTransport)
  return client
}

async function call(client: Client, name: string, args: Record<string, unknown>): Promise<string> {
  const result = (await client.callTool({ name, arguments: args })) as { content: { text: string }[] }
  return result.content[0]!.text
}

describe('createServer', () => {
  it('tells the client that PRO components need a license, without calling the rest free', async () => {
    const instructions = (await connect()).getInstructions() ?? ''
    expect(instructions).toContain('Pages marked (PRO)')
    expect(instructions).toContain('commercial license')
    expect(instructions).not.toContain('MIT')
  })

  it('marks PRO pages in list_components and search_docs', async () => {
    const client = await connect()
    const list = await call(client, 'list_components', {})
    expect(list).toContain('**Multi Select** (PRO)')
    expect(list).not.toContain('**Avatar** (PRO)')
    expect(await call(client, 'search_docs', { query: 'multi select' })).toContain('**Multi Select** (PRO)')
  })

  it('marks a PRO component in get_component_api', async () => {
    const client = await connect()
    expect(await call(client, 'get_component_api', { component: 'MultiSelect' })).toContain('(PRO, requires a commercial license)')
  })
})
