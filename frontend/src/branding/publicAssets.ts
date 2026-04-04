/** Paths under `public/`; prefix with Vite `base` (e.g. `/static/` in production). */
const withBase = (path: string): string => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export const logo64Url = withBase('assets/images/logo-64.png')
export const logo128Url = withBase('assets/images/logo-128.png')
export const bannerUrl = withBase('assets/images/banner.png')
