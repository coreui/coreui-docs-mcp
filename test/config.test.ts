import { describe, expect, it } from 'vitest'

import { docsBase, docsPath, loadConfig } from '../src/config.js'

describe('loadConfig frameworks', () => {
  it('defaults to bootstrap, react, vue (angular excluded)', () => {
    const config = loadConfig([], {} as NodeJS.ProcessEnv)
    expect(config.frameworks).toEqual(['bootstrap', 'react', 'vue'])
  })

  it('allows angular when requested explicitly', () => {
    const config = loadConfig(['--framework', 'angular,react'], {} as NodeJS.ProcessEnv)
    expect(config.frameworks).toEqual(['angular', 'react'])
  })
})

describe('docsBase / docsPath', () => {
  it('uses the /{framework}/docs template by default', () => {
    const config = loadConfig(['--framework', 'react'], {} as NodeJS.ProcessEnv)
    expect(docsBase(config, 'react')).toBe('https://coreui.io/react/docs')
  })

  it('applies a base-path template for a standalone product', () => {
    const config = loadConfig(['--base-path', '/data-grid/{framework}/docs'], {} as NodeJS.ProcessEnv)
    expect(docsPath(config, 'react')).toBe('/data-grid/react/docs')
    expect(docsPath(config, 'angular')).toBe('/data-grid/angular/docs')
  })

  it('lets a per-framework override win over the template (Data Grid vanilla)', () => {
    const config = loadConfig(
      ['--base-path', '/data-grid/{framework}/docs', '--docs-path', 'bootstrap=/data-grid/docs'],
      {} as NodeJS.ProcessEnv,
    )
    expect(docsBase(config, 'bootstrap')).toBe('https://coreui.io/data-grid/docs')
    expect(docsBase(config, 'vue')).toBe('https://coreui.io/data-grid/vue/docs')
  })

  it('reads path config from the environment', () => {
    const config = loadConfig([], {
      COREUI_DOCS_BASE_PATH: '/data-grid/{framework}/docs',
      COREUI_DOCS_PATHS: 'bootstrap=/data-grid/docs',
    } as NodeJS.ProcessEnv)
    expect(docsPath(config, 'bootstrap')).toBe('/data-grid/docs')
    expect(docsPath(config, 'react')).toBe('/data-grid/react/docs')
  })
})
