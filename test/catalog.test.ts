import { describe, expect, it } from 'vitest'

import { normalizeKey, parseLlms, resolveComponent } from '../src/catalog.js'
import { scoreEntries } from '../src/search.js'

const LLMS = `# CoreUI React.js documentation

> UI components.

## Forms

- [Multi Select](/react/docs/forms/multi-select.md): Powerful React Multi Select component.
- [Date Range Picker](/react/docs/forms/date-range-picker.md)

## Components

- [Accordion](/react/docs/components/accordion.md): Vertically collapsing accordions.
- [Avatar](/react/docs/components/avatar.md): Circular user profile pictures.
`

describe('parseLlms', () => {
  const entries = parseLlms(LLMS, 'react', 'https://coreui.io')

  it('parses entries with section, slug, url and description', () => {
    expect(entries).toHaveLength(4)
    const avatar = entries.find((entry) => entry.slug === 'components/avatar')
    expect(avatar).toMatchObject({
      title: 'Avatar',
      section: 'Components',
      slug: 'components/avatar',
      mdUrl: 'https://coreui.io/react/docs/components/avatar.md',
      url: 'https://coreui.io/react/docs/components/avatar/',
      description: 'Circular user profile pictures.',
    })
  })

  it('handles entries without a description', () => {
    const entry = entries.find((item) => item.slug === 'forms/date-range-picker')
    expect(entry?.description).toBe('')
  })
})

describe('resolveComponent', () => {
  const entries = parseLlms(LLMS, 'react', 'https://coreui.io')

  it.each([
    ['avatar', 'components/avatar'],
    ['Avatar', 'components/avatar'],
    ['CAvatar', 'components/avatar'],
    ['multi-select', 'forms/multi-select'],
    ['MultiSelect', 'forms/multi-select'],
    ['CMultiSelect', 'forms/multi-select'],
  ])('resolves %s to %s', (input, slug) => {
    expect(resolveComponent(entries, input)?.slug).toBe(slug)
  })

  it('returns undefined for unknown components', () => {
    expect(resolveComponent(entries, 'nope')).toBeUndefined()
  })
})

describe('scoreEntries', () => {
  const entries = parseLlms(LLMS, 'react', 'https://coreui.io')

  it('ranks exact title matches first', () => {
    const [first] = scoreEntries(entries, 'accordion', 5)
    expect(first?.slug).toBe('components/accordion')
  })

  it('matches multi-term queries against description', () => {
    const results = scoreEntries(entries, 'user profile', 5)
    expect(results[0]?.slug).toBe('components/avatar')
  })
})

describe('normalizeKey', () => {
  it('strips non-alphanumerics and lowercases', () => {
    expect(normalizeKey('Multi-Select')).toBe('multiselect')
  })
})
