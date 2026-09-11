import { describe, expect, it } from 'vitest'

import type { OAuthClient } from '@/models/oauthClient'

import { resolveClientNavigation } from '@/utils/resolveClientNavigation'

function client(overrides: Partial<OAuthClient> & Pick<OAuthClient, 'id' | 'home_url'>): OAuthClient {
  return {
    name: 'app',
    is_public: true,
    description: null,
    icon: null,
    ...overrides,
  }
}

describe('resolveClientNavigation', () => {
  it('routes to password expiry when intercept is active', () => {
    const action = resolveClientNavigation({
      client: client({ id: 10, home_url: 'https://app.example/', _is_ip_blocked: true }),
      interceptPasswordExpiry: true,
    })
    expect(action).toEqual({ kind: 'password_expiry', clientId: 10 })
  })

  it('opens target home when ip is blocked', () => {
    const action = resolveClientNavigation({
      client: client({ id: 10, home_url: 'https://app.example/', _is_ip_blocked: true }),
      interceptPasswordExpiry: false,
    })
    expect(action).toEqual({ kind: 'external', url: 'https://app.example/' })
  })

  it('opens target home when not blocked', () => {
    const action = resolveClientNavigation({
      client: client({ id: 10, home_url: 'https://app.example/' }),
      interceptPasswordExpiry: false,
    })
    expect(action).toEqual({ kind: 'external', url: 'https://app.example/' })
  })
})
