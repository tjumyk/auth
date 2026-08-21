import type { OAuthClient } from '@/models/oauthClient'
import type { IpCheckResult } from '@/utils/enrichOAuthClientsWithIpCheck'

import {
  enrichOAuthClientsWithIpCheck,
  findGateClient,
} from '@/utils/enrichOAuthClientsWithIpCheck'
import { resolveClientNavigation } from '@/utils/resolveClientNavigation'

/**
 * Resolve post-skip navigation for password expiry when resuming via intent_client_id.
 */
export function resolvePasswordExpiryIntentResume(
  clients: OAuthClient[],
  ipCheck: IpCheckResult | null,
  intentClientId: number,
): string | null {
  const enriched = enrichOAuthClientsWithIpCheck(clients, ipCheck)
  const client = enriched.find((c) => c.id === intentClientId)
  if (!client) {
    return null
  }

  const gateClient = findGateClient(enriched)
  const action = resolveClientNavigation({
    client,
    gateClient,
    interceptPasswordExpiry: false,
  })

  switch (action.kind) {
    case 'external':
    case 'gate_grant_access':
      return action.url
    case 'password_expiry':
      return null
  }
}
