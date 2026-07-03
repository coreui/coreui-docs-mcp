import type { DocEntry } from './catalog.js'

export function scoreEntries(entries: DocEntry[], query: string, limit: number): DocEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return entries.slice(0, limit)
  }
  const terms = needle.split(/\s+/).filter(Boolean)

  const ranked = entries
    .map((entry) => ({ entry, score: score(entry, needle, terms) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))

  return ranked.slice(0, limit).map((item) => item.entry)
}

function score(entry: DocEntry, needle: string, terms: string[]): number {
  const title = entry.title.toLowerCase()
  const slug = entry.slug.toLowerCase()
  const description = entry.description.toLowerCase()
  let total = 0

  if (title === needle || slug.endsWith(`/${needle}`)) {
    total += 100
  }
  if (title.startsWith(needle)) {
    total += 40
  }
  if (title.includes(needle)) {
    total += 20
  }
  for (const term of terms) {
    if (title.includes(term)) {
      total += 8
    }
    if (slug.includes(term)) {
      total += 4
    }
    if (description.includes(term)) {
      total += 2
    }
  }
  return total
}
