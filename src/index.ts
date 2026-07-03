import { createRequire } from 'node:module'

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { loadConfig } from './config.js'
import { DocsService } from './docs.js'
import { HttpClient } from './http.js'
import { createServer } from './server.js'

const require = createRequire(import.meta.url)
const pkg = require('../package.json') as { version: string }

async function main(): Promise<void> {
  const config = loadConfig()
  const http = new HttpClient({
    cacheDir: config.cacheDir,
    ttlMs: config.ttlMs,
    userAgent: `coreui-docs-mcp/${pkg.version}`,
  })
  const docs = new DocsService(config, http)
  const server = createServer(docs, pkg.version)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write(`coreui-docs-mcp ${pkg.version} ready — frameworks: ${config.frameworks.join(', ')}\n`)
}

main().catch((error) => {
  process.stderr.write(`coreui-docs-mcp failed to start: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
