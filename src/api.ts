interface ApiProp {
  name: string
  type?: string
  default?: unknown
  description?: string
  since?: string | null
  deprecated?: string | null
}

interface ApiEvent {
  name: string
  description?: string
  properties?: { name: string; type?: string; description?: string }[]
}

interface ApiSlot {
  name: string
  description?: string
  bindings?: { name: string; type?: string; description?: string }[]
}

interface ApiData {
  name?: string
  imports?: string
  props?: ApiProp[]
  events?: ApiEvent[]
  slots?: ApiSlot[]
}

function cell(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function renderApiData(raw: unknown): string {
  const data = raw as ApiData
  const out: string[] = []
  if (data.name) {
    out.push(`## ${data.name}`, '')
  }
  if (data.imports) {
    out.push('```', data.imports, '```', '')
  }

  if (data.props?.length) {
    out.push('### Props', '', '| Name | Type | Default | Description |', '| --- | --- | --- | --- |')
    for (const prop of data.props) {
      const description = [
        prop.description,
        prop.since ? `_Since ${prop.since}_` : '',
        prop.deprecated ? `**Deprecated:** ${prop.deprecated}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      out.push(`| \`${prop.name}\` | ${cell(prop.type)} | ${cell(prop.default)} | ${cell(description)} |`)
    }
    out.push('')
  }

  if (data.events?.length) {
    out.push('### Events', '', '| Name | Description |', '| --- | --- |')
    for (const event of data.events) {
      out.push(`| \`${event.name}\` | ${cell(event.description)} |`)
    }
    out.push('')
  }

  if (data.slots?.length) {
    out.push('### Slots', '', '| Name | Description |', '| --- | --- |')
    for (const slot of data.slots) {
      out.push(`| \`${slot.name}\` | ${cell(slot.description)} |`)
    }
    out.push('')
  }

  return out.join('\n').trim()
}
