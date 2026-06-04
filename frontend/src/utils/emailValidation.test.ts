import { describe, expect, it } from 'vitest'

import { isValidEmail } from '@/utils/emailValidation'

describe('isValidEmail', () => {
  it('accepts hyphenated domain labels', () => {
    expect(isValidEmail('hepeng79@huawei-partners.com')).toBe(true)
  })

  it('rejects label with leading hyphen', () => {
    expect(isValidEmail('user@-bad.com')).toBe(false)
  })
})
