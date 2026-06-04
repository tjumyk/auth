import { describe, expect, it } from 'vitest'

import { getUserDisplayName } from '@/utils/userDisplayName'

describe('getUserDisplayName', () => {
  it('prefers nickname then real_name then name', () => {
    expect(
      getUserDisplayName({ name: 'login', nickname: 'Nick', real_name: 'Real' }),
    ).toBe('Nick')
    expect(getUserDisplayName({ name: 'login', real_name: 'Real' })).toBe('Real')
    expect(getUserDisplayName({ name: 'login' })).toBe('login')
  })
})
