import { describe, expect, it } from 'vitest'

import { buildGateGrantAccessUrl } from '@/utils/buildGateGrantAccessUrl'

describe('buildGateGrantAccessUrl', () => {
  it('builds grant-access URL with intent_client_id', () => {
    expect(buildGateGrantAccessUrl('https://gate.example/', 42)).toBe(
      'https://gate.example/grant-access?intent_client_id=42',
    )
  })

  it('handles home_url with path prefix', () => {
    expect(buildGateGrantAccessUrl('https://gate.example/apps/gate/', 7)).toBe(
      'https://gate.example/apps/gate/grant-access?intent_client_id=7',
    )
  })

  it('strips existing query and hash from gate home url', () => {
    expect(buildGateGrantAccessUrl('https://gate.example/?foo=1#section', 3)).toBe(
      'https://gate.example/grant-access?intent_client_id=3',
    )
  })
})
