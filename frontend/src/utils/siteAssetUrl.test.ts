import { describe, expect, it, vi } from 'vitest'

import { joinSiteBaseWithPath, siteAssetSrc } from '@/utils/siteAssetUrl'

describe('joinSiteBaseWithPath', () => {
  it('joins subpath base with stored upload path', () => {
    expect(joinSiteBaseWithPath('/id/', 'upload/icon/x.png')).toBe('/id/upload/icon/x.png')
  })

  it('strips leading slashes from stored path', () => {
    expect(joinSiteBaseWithPath('/id/', '/upload/icon/x.png')).toBe('/id/upload/icon/x.png')
  })
})

describe('siteAssetSrc', () => {
  it('prefixes upload path with VITE_SITE_BASE_URL', () => {
    vi.stubEnv('VITE_SITE_BASE_URL', '/id/')
    expect(siteAssetSrc('upload/icon/x.png')).toBe('/id/upload/icon/x.png')
    vi.unstubAllEnvs()
  })

  it('uses root app base when VITE_SITE_BASE_URL is unset', () => {
    vi.stubEnv('VITE_SITE_BASE_URL', '/')
    vi.stubEnv('BASE_URL', '/static/')
    expect(siteAssetSrc('upload/icon/x.png')).toBe('/upload/icon/x.png')
    vi.unstubAllEnvs()
  })

  it('passes through absolute http(s) URLs', () => {
    expect(siteAssetSrc('https://cdn.example/icon.png')).toBe('https://cdn.example/icon.png')
  })
})
