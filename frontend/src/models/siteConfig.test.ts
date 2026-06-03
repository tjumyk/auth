import { describe, expect, it } from 'vitest'

import { resolveSiteName, resolveSiteOptionalString } from '@/models/siteConfig'

describe('resolveSiteName', () => {
  it('prefers env over config', () => {
    expect(resolveSiteName('From env', 'From config')).toBe('From env')
  })

  it('falls back to config when env is unset', () => {
    expect(resolveSiteName(undefined, 'From config')).toBe('From config')
  })

  it('uses Identity when env is empty and config is unset', () => {
    expect(resolveSiteName('', undefined)).toBe('Identity')
    expect(resolveSiteName(undefined, undefined)).toBe('Identity')
  })

  it('treats docker unset sentinel as config fallback', () => {
    expect(resolveSiteName('__UNSET__', 'From config')).toBe('From config')
  })
})

describe('resolveSiteOptionalString', () => {
  it('prefers env over config', () => {
    expect(resolveSiteOptionalString('Env org', 'Config org')).toBe('Env org')
  })

  it('allows empty env to override config', () => {
    expect(resolveSiteOptionalString('', 'Config org')).toBe('')
  })

  it('falls back to config when env is unset', () => {
    expect(resolveSiteOptionalString(undefined, 'Config org')).toBe('Config org')
  })

  it('returns empty string when neither source is set', () => {
    expect(resolveSiteOptionalString(undefined, undefined)).toBe('')
  })

  it('treats docker unset sentinel as config fallback', () => {
    expect(resolveSiteOptionalString('__UNSET__', 'Config org')).toBe('Config org')
  })
})
