/**
 * Prefix absolute app paths with the Vite base (e.g. `/id/`) for subpath deployment.
 * React Router basename handles page routes; API/upload paths need this explicitly.
 */
export function withAppBasePath(path: string): string {
  if (!path.startsWith('/')) {
    return path
  }
  const base = import.meta.env.BASE_URL
  if (!base || base === '/') {
    return path
  }
  const prefix = base.replace(/\/+$/, '')
  return `${prefix}${path}`
}
