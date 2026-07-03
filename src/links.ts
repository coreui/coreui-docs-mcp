import { createRequire } from 'node:module'

import { normalizeKey } from './catalog.js'

const require = createRequire(import.meta.url)
const components = require('@coreui/internal-links/components.json') as Record<string, Record<string, string>>

export interface CrossFrameworkLinks {
  component: string
  links: Record<string, string>
}

export function crossFrameworkLinks(component: string): CrossFrameworkLinks | undefined {
  const direct = components[component]
  if (direct) {
    return { component, links: direct }
  }
  const target = normalizeKey(component)
  const withoutC = target.startsWith('c') ? target.slice(1) : target
  for (const [name, links] of Object.entries(components)) {
    const key = normalizeKey(name)
    if (key === target || key === withoutC) {
      return { component: name, links }
    }
  }
  return undefined
}
