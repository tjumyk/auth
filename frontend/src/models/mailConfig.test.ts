import { describe, expect, it } from 'vitest'

import { resolveMailEnabled } from '@/models/mailConfig'

describe('resolveMailEnabled', () => {
  it('prefers env over config', () => {
    expect(resolveMailEnabled('false', true)).toBe(false)
    expect(resolveMailEnabled('true', false)).toBe(true)
  })

  it('falls back to config when env is unset', () => {
    expect(resolveMailEnabled(undefined, false)).toBe(false)
    expect(resolveMailEnabled(undefined, true)).toBe(true)
  })

  it('defaults to true when neither source is set', () => {
    expect(resolveMailEnabled(undefined, undefined)).toBe(true)
  })

  it('treats docker unset sentinel as config fallback', () => {
    expect(resolveMailEnabled('__UNSET__', false)).toBe(false)
  })

  it('accepts common boolean strings', () => {
    expect(resolveMailEnabled('yes', undefined)).toBe(true)
    expect(resolveMailEnabled('0', undefined)).toBe(false)
  })

  it('ignores invalid env and uses config', () => {
    expect(resolveMailEnabled('maybe', false)).toBe(false)
  })
})
