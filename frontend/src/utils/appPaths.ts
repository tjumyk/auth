/// <reference types="vite/client" />

import { normalizeAppBase } from '@/utils/pathBases'

/** Runtime: router, `/api`, `/upload` (matches backend `SITE.base_url`). */
export function getAppBase(): string {
  return normalizeAppBase(import.meta.env.VITE_SITE_BASE_URL)
}

/** Runtime: hashed bundles and public branding (`import.meta.env.BASE_URL`). */
export function getAssetBase(): string {
  const base = import.meta.env.BASE_URL
  if (!base || base.trim() === '') {
    return '/'
  }
  return normalizeAppBase(base)
}

/** React Router `basename` without trailing slash, or `undefined` at site root. */
export function appBasePathname(): string | undefined {
  const app = getAppBase()
  if (app === '/') {
    return undefined
  }
  return app.replace(/\/+$/, '')
}
