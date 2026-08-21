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

const gateClient = client({
  id: 1,
  name: 'gate',
  home_url: 'https://gate.example/',
})

describe('resolveClientNavigation', () => {
  it('routes to password expiry when intercept is active', () => {
    const action = resolveClientNavigation({
      client: client({ id: 10, home_url: 'https://app.example/', _is_ip_blocked: true }),
      gateClient,
      interceptPasswordExpiry: true,
    })
    expect(action).toEqual({ kind: 'password_expiry', clientId: 10 })
  })

  it('routes blocked non-gate app to grant-access', () => {
    const action = resolveClientNavigation({
      client: client({ id: 10, home_url: 'https://app.example/', _is_ip_blocked: true }),
      gateClient,
      interceptPasswordExpiry: false,
    })
    expect(action).toEqual({
      kind: 'gate_grant_access',
      clientId: 10,
      url: 'https://gate.example/grant-access?intent_client_id=10',
    })
  })

  it('opens gate home directly when clicking gate client', () => {
    const action = resolveClientNavigation({
      client: gateClient,
      gateClient,
      interceptPasswordExpiry: false,
    })
    expect(action).toEqual({ kind: 'external', url: 'https://gate.example/' })
  })

  it('opens target home when not blocked', () => {
    const action = resolveClientNavigation({
      client: client({ id: 10, home_url: 'https://app.example/' }),
      gateClient,
      interceptPasswordExpiry: false,
    })
    expect(action).toEqual({ kind: 'external', url: 'https://app.example/' })
  })

  it('falls back to external when blocked but gate client missing', () => {
    const action = resolveClientNavigation({
      client: client({ id: 10, home_url: 'https://app.example/', _is_ip_blocked: true }),
      interceptPasswordExpiry: false,
    })
    expect(action).toEqual({ kind: 'external', url: 'https://app.example/' })
  })
})
