import { describe, expect, it } from 'vitest'

import { parseForcedLocale, parseForcedTheme } from '@/models/uiConfig'

describe('parseForcedTheme', () => {
  it('prefers env over config', () => {
    expect(parseForcedTheme('light', 'dark')).toBe('light')
  })

  it('falls back to config when env is unset or invalid', () => {
    expect(parseForcedTheme(undefined, 'dark')).toBe('dark')
    expect(parseForcedTheme('', 'dark')).toBe('dark')
    expect(parseForcedTheme('auto', 'dark')).toBe('dark')
  })

  it('returns null when neither source is valid', () => {
    expect(parseForcedTheme(undefined, undefined)).toBeNull()
    expect(parseForcedTheme('system', 'auto')).toBeNull()
  })
})

describe('parseForcedLocale', () => {
  it('prefers env over config', () => {
    expect(parseForcedLocale('en', 'zh-Hans')).toBe('en')
  })

  it('falls back to config when env is unset or invalid', () => {
    expect(parseForcedLocale(undefined, 'zh-Hans')).toBe('zh-Hans')
    expect(parseForcedLocale('', 'zh-Hans')).toBe('zh-Hans')
    expect(parseForcedLocale('zh', 'zh-Hans')).toBe('zh-Hans')
  })

  it('returns null when neither source is valid', () => {
    expect(parseForcedLocale(undefined, undefined)).toBeNull()
    expect(parseForcedLocale('fr', 'de')).toBeNull()
  })
})
