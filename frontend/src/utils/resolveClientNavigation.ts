import type { OAuthClient } from '@/models/oauthClient'

import { buildGateGrantAccessUrl } from '@/utils/buildGateGrantAccessUrl'

export type ClientNavAction =
  | { kind: 'password_expiry'; clientId: number }
  | { kind: 'gate_grant_access'; url: string; clientId: number }
  | { kind: 'external'; url: string }

export function isGateClient(client: OAuthClient, gateClient: OAuthClient | undefined): boolean {
  return gateClient != null && client.id === gateClient.id
}

/**
 * Decide how to navigate when the user opens an OAuth client from the auth home page.
 */
export function resolveClientNavigation(input: {
  client: OAuthClient
  gateClient?: OAuthClient
  interceptPasswordExpiry: boolean
}): ClientNavAction {
  const { client, gateClient, interceptPasswordExpiry } = input

  if (interceptPasswordExpiry) {
    return { kind: 'password_expiry', clientId: client.id }
  }

  if (
    client._is_ip_blocked === true &&
    gateClient != null &&
    !isGateClient(client, gateClient)
  ) {
    return {
      kind: 'gate_grant_access',
      clientId: client.id,
      url: buildGateGrantAccessUrl(gateClient.home_url, client.id),
    }
  }

  return { kind: 'external', url: client.home_url }
}
