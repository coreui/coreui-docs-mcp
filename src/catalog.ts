import type { Framework } from './config.js'

export interface DocEntry {
  title: string
  section: string
  slug: string
  path: string
  mdUrl: string
  url: string
  description: string
}

const ENTRY_RE = /^-\s+\[(.+?)\]\((.+?)\)(?::\s*(.*))?$/
const SECTION_RE = /^##\s+(.+?)\s*$/

export function parseLlms(text: string, framework: Framework, origin: string): DocEntry[] {
  const prefix = `/${framework}/docs/`
  const entries: DocEntry[] = []
  let section = ''

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    const sectionMatch = SECTION_RE.exec(line)
    if (sectionMatch) {
      section = sectionMatch[1]!
      continue
    }
    const entryMatch = ENTRY_RE.exec(line)
    if (!entryMatch) {
      continue
    }
    const [, title, href, description = ''] = entryMatch
    const path = href!.startsWith('http') ? new URL(href!).pathname : href!
    if (!path.startsWith(prefix) || !path.endsWith('.md')) {
      continue
    }
    const slug = path.slice(prefix.length, -'.md'.length)
    entries.push({
      title: title!,
      section,
      slug,
      path,
      mdUrl: `${origin}${path}`,
      url: `${origin}${prefix}${slug}/`,
      description: description.trim(),
    })
  }

  return entries
}

export function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function resolveComponent(entries: DocEntry[], component: string): DocEntry | undefined {
  const target = normalizeKey(component)
  const withoutC = target.startsWith('c') ? target.slice(1) : target
  const candidates = [target, withoutC]

  for (const entry of entries) {
    const base = entry.slug.split('/').pop() ?? entry.slug
    const baseKey = normalizeKey(base)
    if (candidates.includes(baseKey)) {
      return entry
    }
  }
  for (const entry of entries) {
    if (candidates.includes(normalizeKey(entry.title))) {
      return entry
    }
  }
  return undefined
}
