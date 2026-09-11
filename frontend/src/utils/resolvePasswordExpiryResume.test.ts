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

describe('resolvePasswordExpiryIntentResume', () => {
  it('returns home_url when intent client exists', () => {
    const url = resolvePasswordExpiryIntentResume(
      [client({ id: 10, name: 'target', home_url: 'https://target.example/' })],
      10,
    )
    expect(url).toBe('https://target.example/')
  })

  it('returns home_url when intent app is ip blocked', () => {
    const url = resolvePasswordExpiryIntentResume(
      [
        client({
          id: 10,
          name: 'target',
          home_url: 'https://target.example/',
          _is_ip_blocked: true,
        }),
      ],
      10,
    )
    expect(url).toBe('https://target.example/')
  })

  it('returns null when intent client is missing', () => {
    const url = resolvePasswordExpiryIntentResume([], 99)
    expect(url).toBeNull()
  })
})
