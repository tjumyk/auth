/** Paths under `public/`; prefix with Vite `base` (e.g. `/static/` in production). */
import { getAssetBase } from '@/utils/appPaths'

const withBase = (path: string): string => `${getAssetBase()}${path.replace(/^\//, '')}`

export const logo64Url = withBase('assets/images/logo-64.png')
export const logo128Url = withBase('assets/images/logo-128.png')
export const bannerUrl = withBase('assets/images/banner.png')
