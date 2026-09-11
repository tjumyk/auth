import type { OAuthClient } from '@/models/oauthClient'

/**
 * Resolve post-skip navigation for password expiry when resuming via intent_client_id.
 */
export function resolvePasswordExpiryIntentResume(
  clients: OAuthClient[],
  intentClientId: number,
): string | null {
  const client = clients.find((c) => c.id === intentClientId)
  return client?.home_url ?? null
}
