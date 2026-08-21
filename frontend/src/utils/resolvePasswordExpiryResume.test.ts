import { describe, expect, it } from 'vitest'

import type { OAuthClient } from '@/models/oauthClient'

import { resolvePasswordExpiryIntentResume } from '@/utils/resolvePasswordExpiryResume'

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

describe('resolvePasswordExpiryIntentResume', () => {
  it('returns home_url when ip check passes', () => {
    const url = resolvePasswordExpiryIntentResume(
      [
        gateClient,
        client({ id: 10, name: 'target', home_url: 'https://target.example/' }),
      ],
      { check_pass: true, guarded_ports: [443] },
      10,
    )
    expect(url).toBe('https://target.example/')
  })

  it('returns grant-access URL when ip is blocked', () => {
    const url = resolvePasswordExpiryIntentResume(
      [
        gateClient,
        client({ id: 10, name: 'target', home_url: 'https://target.example/' }),
      ],
      { check_pass: false, guarded_ports: [443] },
      10,
    )
    expect(url).toBe('https://gate.example/grant-access?intent_client_id=10')
  })

  it('returns null when intent client is missing', () => {
    const url = resolvePasswordExpiryIntentResume([gateClient], null, 99)
    expect(url).toBeNull()
  })
})
