import { getAppBase } from '@/utils/appPaths'

/**
 * Resolve URLs for site-hosted assets (uploads, user avatars, OAuth client icons).
 * Stored paths are relative to SITE.base_url (VITE_SITE_BASE_URL); absolute http(s) URLs pass through.
 * In dev, Vite proxies /upload to Flask (see vite.config.ts).
 */

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

/**
 * Single stored path from the API: relative to the site base, or already an absolute URL.
 */
export function siteAssetSrc(storedPath: string | null | undefined): string | undefined {
  const value = storedPath?.trim()
  if (!value) {
    return undefined
  }
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }
  return joinSiteBaseWithPath(getAppBase(), value)
}

/** Account user payloads: prefer relative `avatar`, then optional absolute `avatar_full`. */
export function userAvatarSrc(user: {
  avatar_full?: string | null
  avatar?: string | null
}): string | undefined {
  return siteAssetSrc(user.avatar) ?? siteAssetSrc(user.avatar_full)
}
