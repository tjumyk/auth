/**
 * Resolves avatar (or OAuth client icon) URLs for <img src>.
 * Prefer relative `avatar` joined with SITE.base_url (VITE_SITE_BASE_URL); use `avatar_full` only when relative is absent.
 * In dev, Vite proxies /upload to Flask (see vite.config.ts).
 */

function getSiteBaseUrl(): string {
  const raw = import.meta.env.VITE_SITE_BASE_URL
  const s = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : '/'
  return s
}

/** Join SITE.base_url with a stored relative path (e.g. upload/avatar/…). */
export function joinSiteBaseWithPath(baseUrl: string, relativePath: string): string {
  const rel = relativePath.trim().replace(/^\/+/, '')
  const base = baseUrl.trim() || '/'
  if (base === '/') {
    return `/${rel}`
  }
  const prefix = base.replace(/\/+$/, '')
  const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`
  return `${normalized}/${rel}`
}

export function userAvatarSrc(user: {
  avatar_full?: string | null
  avatar?: string | null
}): string | undefined {
  const rel = user.avatar?.trim()
  if (rel) {
    if (rel.startsWith('http://') || rel.startsWith('https://')) {
      return rel
    }
    return joinSiteBaseWithPath(getSiteBaseUrl(), rel)
  }
  const full = user.avatar_full?.trim()
  return full || undefined
}
