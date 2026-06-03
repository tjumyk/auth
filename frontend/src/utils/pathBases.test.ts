import { describe, expect, it } from 'vitest'

import {
  combineAssetBase,
  normalizeAppBase,
  normalizeStaticPath,
  resolveAppBaseFromEnv,
  resolveAssetBaseFromEnv,
} from '@/utils/pathBases'

describe('normalizeAppBase', () => {
  it('normalizes root and subpaths', () => {
    expect(normalizeAppBase('/')).toBe('/')
    expect(normalizeAppBase('id')).toBe('/id/')
    expect(normalizeAppBase('/id')).toBe('/id/')
  })
})

describe('normalizeStaticPath', () => {
  it('accepts static/ or static without leading slash', () => {
    expect(normalizeStaticPath('static/')).toBe('static/')
    expect(normalizeStaticPath('/static')).toBe('static/')
    expect(normalizeStaticPath('')).toBe('')
    expect(normalizeStaticPath(undefined)).toBe('')
  })
})

describe('combineAssetBase', () => {
  it('combines app base with static prefix for Flask-direct builds', () => {
    expect(combineAssetBase('/', 'static/')).toBe('/static/')
    expect(combineAssetBase('/id/', 'static/')).toBe('/id/static/')
    expect(combineAssetBase('/', '')).toBe('/')
    expect(combineAssetBase('/id/', '')).toBe('/id/')
  })
})

describe('resolveAppBaseFromEnv', () => {
  it('prefers VITE_SITE_BASE_URL over SITE_BASE_URL', () => {
    expect(
      resolveAppBaseFromEnv({ VITE_SITE_BASE_URL: '/vite/', SITE_BASE_URL: '/site/' }),
    ).toBe('/vite/')
    expect(resolveAppBaseFromEnv({ SITE_BASE_URL: '/site/' })).toBe('/site/')
  })
})

describe('resolveAssetBaseFromEnv', () => {
  it('uses app base only in dev', () => {
    expect(resolveAssetBaseFromEnv({ VITE_SITE_BASE_URL: '/id/' }, { production: false })).toBe(
      '/',
    )
  })

  it('combines app base and static path in production', () => {
    expect(
      resolveAssetBaseFromEnv(
        { VITE_SITE_BASE_URL: '/', VITE_STATIC_PATH: 'static/' },
        { production: true },
      ),
    ).toBe('/static/')
    expect(
      resolveAssetBaseFromEnv(
        { VITE_SITE_BASE_URL: '/id/', VITE_STATIC_PATH: '' },
        { production: true },
      ),
    ).toBe('/id/')
  })
})
