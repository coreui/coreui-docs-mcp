import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js', '--framework', 'react'],
})
const client = new Client({ name: 'smoke', version: '0' })
await client.connect(transport)

const tools = await client.listTools()
console.log('TOOLS:', tools.tools.map((t) => t.name).join(', '))

const search = await client.callTool({ name: 'search_docs', arguments: { query: 'multi select', framework: 'react' } })
console.log('\nSEARCH:\n' + search.content[0].text.split('\n').slice(0, 4).join('\n'))

const api = await client.callTool({ name: 'get_component_api', arguments: { component: 'avatar', framework: 'react' } })
console.log('\nAPI (first lines):\n' + api.content[0].text.split('\n').slice(0, 8).join('\n'))

const links = await client.callTool({ name: 'get_cross_framework_links', arguments: { component: 'accordion' } })
console.log('\nLINKS:\n' + links.content[0].text)

await client.close()
