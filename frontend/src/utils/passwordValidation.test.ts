import { describe, expect, it } from 'vitest'

import { validateNewPassword } from '@/utils/passwordValidation'

const t = (key: string): string => key

describe('validateNewPassword', () => {
  it('accepts passwords with three of four classes', () => {
    expect(validateNewPassword('Abcdefg1', t)).toBeNull()
    expect(validateNewPassword('Abcdefg!', t)).toBeNull()
  })

  it('rejects passwords with fewer than three classes', () => {
    expect(validateNewPassword('abcdefgh', t)).toBe('passwordRequiresThreeClasses')
  })

  it('rejects passwords longer than 64 characters', () => {
    expect(validateNewPassword('A1a!' + 'x'.repeat(61), t)).toBe('passwordMaxLength')
  })
})
