import { getAppBase } from '@/utils/appPaths'

/**
 * Prefix absolute app paths with SITE.base_url (e.g. `/id/`) for subpath deployment.
 * React Router basename handles page routes; API/upload paths need this explicitly.
 */
export function withAppBasePath(path: string): string {
  if (!path.startsWith('/')) {
    return path
  }
  const base = getAppBase()
  if (base === '/') {
    return path
  }
  const prefix = base.replace(/\/+$/, '')
  return `${prefix}${path}`
}
