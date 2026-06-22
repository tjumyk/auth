import { describe, expect, it } from 'vitest'

import { UserSchema } from '@/models/user'

describe('UserSchema', () => {
  it('parses a minimal whoami-style payload', () => {
    const raw = {
      id: 1,
      name: 'alice',
      email: 'a@example.com',
      nickname: null,
      real_name: null,
      mobile: null,
      avatar: null,
      is_active: true,
      is_two_factor_enabled: false,
      external_auth_enforced: false,
      groups: [{ id: 1, name: 'admin', description: null }],
    }
    const r = UserSchema.safeParse(raw)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.name).toBe('alice')
      expect(r.data.groups?.[0]?.name).toBe('admin')
    }
  })

  it('parses password expiry metadata', () => {
    const parsed = UserSchema.safeParse({
      id: 1,
      name: 'alice',
      email: 'a@example.com',
      is_active: true,
      is_two_factor_enabled: false,
      external_auth_enforced: false,
      password_expires_at: '2026-09-01T00:00:00',
      password_expiry_status: 'warning_1month',
      password_expiry_intercept_active: false,
    })
    expect(parsed.success).toBe(true)
  })
})
