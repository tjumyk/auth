import type { OAuthClient } from '@/models/oauthClient'

export type ClientNavAction =
  | { kind: 'password_expiry'; clientId: number }
  | { kind: 'external'; url: string }

/**
 * Decide how to navigate when the user opens an OAuth client from the auth home page.
 */
export function resolveClientNavigation(input: {
  client: OAuthClient
  interceptPasswordExpiry: boolean
}): ClientNavAction {
  const { client, interceptPasswordExpiry } = input

  if (interceptPasswordExpiry) {
    return { kind: 'password_expiry', clientId: client.id }
  }

  return { kind: 'external', url: client.home_url }
}
