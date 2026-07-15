import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

export const FRAMEWORKS = ['bootstrap', 'react', 'vue', 'angular'] as const
export type Framework = (typeof FRAMEWORKS)[number]

// Enabled by default when `--framework` is omitted. Angular is allowed (so a
// standalone product like Data Grid can opt into it) but stays out of the default
// set, which mirrors the main component-library docs currently on the engine.
export const DEFAULT_FRAMEWORKS: readonly Framework[] = ['bootstrap', 'react', 'vue']

// Path (after the origin) where a framework's docs live, with `{framework}`
// substituted. The main library uses `/<framework>/docs`; a standalone product
// overrides this (e.g. Data Grid: `/data-grid/{framework}/docs`, plus a per-
// framework override for vanilla, which has no framework segment).
export const DEFAULT_BASE_PATH = '/{framework}/docs'

export interface Config {
  frameworks: Framework[]
  defaultFramework: Framework
  origin: string
  basePath: string
  paths: Partial<Record<Framework, string>>
  cacheDir: string
  ttlMs: number
}

function normalizePath(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function parseFrameworks(value: string | undefined): Framework[] {
  if (!value) {
    return [...DEFAULT_FRAMEWORKS]
  }
  const parsed = value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is Framework => (FRAMEWORKS as readonly string[]).includes(entry))
  return parsed.length > 0 ? parsed : [...DEFAULT_FRAMEWORKS]
}

// Parse `bootstrap=/data-grid/docs,react=/data-grid/react/docs` into a per-framework
// path map. Unknown framework keys are ignored.
function parseDocsPaths(value: string | undefined): Partial<Record<Framework, string>> {
  if (!value) {
    return {}
  }
  const paths: Partial<Record<Framework, string>> = {}
  for (const pair of value.split(',')) {
    const eq = pair.indexOf('=')
    if (eq === -1) {
      continue
    }
    const key = pair.slice(0, eq).trim().toLowerCase()
    const path = pair.slice(eq + 1).trim()
    if (!path || !(FRAMEWORKS as readonly string[]).includes(key)) {
      continue
    }
    paths[key as Framework] = normalizePath(path)
  }
  return paths
}

function readFlag(argv: string[], name: string): string | undefined {
  const inline = argv.find((arg) => arg.startsWith(`--${name}=`))
  if (inline) {
    return inline.slice(name.length + 3)
  }
  const index = argv.indexOf(`--${name}`)
  if (index !== -1 && argv[index + 1] && !argv[index + 1]!.startsWith('--')) {
    return argv[index + 1]
  }
  return undefined
}

function defaultCacheDir(): string {
  const base =
    process.env.XDG_CACHE_HOME ?? (process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches') : join(homedir(), '.cache'))
  try {
    return join(base, 'coreui-docs-mcp')
  } catch {
    return join(tmpdir(), 'coreui-docs-mcp')
  }
}

export function loadConfig(argv: string[] = process.argv.slice(2), env: NodeJS.ProcessEnv = process.env): Config {
  const frameworks = parseFrameworks(readFlag(argv, 'framework') ?? readFlag(argv, 'frameworks') ?? env.COREUI_DOCS_FRAMEWORKS)
  const origin = (readFlag(argv, 'base-url') ?? env.COREUI_DOCS_BASE_URL ?? 'https://coreui.io').replace(/\/$/, '')
  const basePath = readFlag(argv, 'base-path') ?? env.COREUI_DOCS_BASE_PATH ?? DEFAULT_BASE_PATH
  const paths = parseDocsPaths(readFlag(argv, 'docs-path') ?? env.COREUI_DOCS_PATHS)
  const ttlMinutes = Number(readFlag(argv, 'ttl') ?? env.COREUI_DOCS_TTL_MINUTES ?? 360)
  return {
    frameworks,
    defaultFramework: frameworks[0]!,
    origin,
    basePath,
    paths,
    cacheDir: env.COREUI_DOCS_CACHE_DIR ?? defaultCacheDir(),
    ttlMs: (Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 360) * 60_000,
  }
}

// The docs path (after the origin) for a framework: an explicit per-framework
// override wins, otherwise the `{framework}` template is substituted.
export function docsPath(config: Config, framework: Framework): string {
  const path = config.paths[framework] ?? config.basePath.replace(/\{framework\}/g, framework)
  return normalizePath(path)
}

export function docsBase(config: Config, framework: Framework): string {
  return `${config.origin}${docsPath(config, framework)}`
}
