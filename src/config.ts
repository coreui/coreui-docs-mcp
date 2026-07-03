import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

export const FRAMEWORKS = ['bootstrap', 'react', 'vue'] as const
export type Framework = (typeof FRAMEWORKS)[number]

export interface Config {
  frameworks: Framework[]
  defaultFramework: Framework
  origin: string
  cacheDir: string
  ttlMs: number
}

function parseFrameworks(value: string | undefined): Framework[] {
  if (!value) {
    return [...FRAMEWORKS]
  }
  const parsed = value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is Framework => (FRAMEWORKS as readonly string[]).includes(entry))
  return parsed.length > 0 ? parsed : [...FRAMEWORKS]
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
  const ttlMinutes = Number(readFlag(argv, 'ttl') ?? env.COREUI_DOCS_TTL_MINUTES ?? 360)
  return {
    frameworks,
    defaultFramework: frameworks[0]!,
    origin,
    cacheDir: env.COREUI_DOCS_CACHE_DIR ?? defaultCacheDir(),
    ttlMs: (Number.isFinite(ttlMinutes) && ttlMinutes > 0 ? ttlMinutes : 360) * 60_000,
  }
}

export function docsBase(config: Config, framework: Framework): string {
  return `${config.origin}/${framework}/docs`
}
