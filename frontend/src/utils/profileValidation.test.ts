import { describe, expect, it } from 'vitest'

import { normalizeMobile } from '@/utils/profileValidation'

describe('normalizeMobile', () => {
  it('strips separators', () => {
    expect(normalizeMobile('+86 138-0013-8000')).toBe('+8613800138000')
    expect(normalizeMobile('138 0013 8000')).toBe('13800138000')
  })

  it('returns null for empty or invalid', () => {
    expect(normalizeMobile('')).toBeNull()
    expect(normalizeMobile('abc')).toBeNull()
  })
})
