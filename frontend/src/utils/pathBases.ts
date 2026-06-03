/** Sentinel used in Docker build args when a value is intentionally unset. */
export const UNSET_ENV_SENTINEL = '__UNSET__'

export function normalizeEnvValue(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined
  }
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === UNSET_ENV_SENTINEL) {
    return undefined
  }
  return trimmed
}

/** App mount path (router, API, uploads). Always starts and ends with `/`. */
export function normalizeAppBase(raw: string | undefined, fallback = '/'): string {
  const value = normalizeEnvValue(raw) ?? fallback
  let base = value
  if (!base.startsWith('/')) {
    base = `/${base}`
  }
  if (!base.endsWith('/')) {
    base = `${base}/`
  }
  return base
}

/**
 * Extra URL segment before hashed assets when Flask serves them under `/static/…`.
 * Empty for Docker/nginx (assets at document root).
 */
export function normalizeStaticPath(raw: string | undefined): string {
  const value = normalizeEnvValue(raw)
  if (!value) {
    return ''
  }
  let segment = value.replace(/^\/+/, '')
  if (segment === '') {
    return ''
  }
  if (!segment.endsWith('/')) {
    segment = `${segment}/`
  }
  return segment
}

/** Vite `base` / `import.meta.env.BASE_URL` = app base + static prefix. */
export function combineAssetBase(appBase: string, staticPath: string): string {
  const app = normalizeAppBase(appBase === '' ? '/' : appBase)
  const stat = normalizeStaticPath(staticPath)
  if (!stat) {
    return app
  }
  const prefix = app === '/' ? '' : app.replace(/\/+$/, '')
  return `${prefix}/${stat}`
}

export function resolveAppBaseFromEnv(env: {
  VITE_SITE_BASE_URL?: string
  SITE_BASE_URL?: string
}): string {
  return normalizeAppBase(env.VITE_SITE_BASE_URL ?? env.SITE_BASE_URL)
}

export function resolveAssetBaseFromEnv(
  env: Record<string, string>,
  options: { production: boolean },
): string {
  const appBase = resolveAppBaseFromEnv(env)
  if (!options.production) {
    return '/'
  }
  return combineAssetBase(appBase, env.VITE_STATIC_PATH ?? '')
}
