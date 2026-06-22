import { describe, expect, it } from 'vitest'

import { formatPasswordServiceError, isPasswordExpiredError } from '@/utils/passwordErrorMessage'

describe('passwordErrorMessage', () => {
  it('detects password expired by code or msg', () => {
    expect(isPasswordExpiredError({ msg: 'password expired', code: 'password_expired' })).toBe(true)
    expect(isPasswordExpiredError({ msg: 'password expired' })).toBe(true)
    expect(isPasswordExpiredError({ msg: 'other' })).toBe(false)
  })

  it('maps password recently used to i18n key', () => {
    const t = (key: string) => (key === 'passwordRecentlyUsed' ? 'Recently used' : key)
    expect(formatPasswordServiceError({ msg: 'password recently used' }, t)).toEqual({
      title: 'Recently used',
    })
  })
})
