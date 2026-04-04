import { z } from 'zod'

import { apiClient } from '@/api/client'
import { OAuthClientSchema, type OAuthClient } from '@/models/oauthClient'

const OAuthConnectResultSchema = z.object({
  token: z.string().optional(),
  redirect_url: z.string().optional(),
})

export type OAuthConnectResult = z.infer<typeof OAuthConnectResultSchema>

export async function fetchOAuthClient(clientId: number): Promise<OAuthClient> {
  const res = await apiClient.get<unknown>(`/api/oauth/clients/${clientId}`)
  const parsed = OAuthClientSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('oauth client parse error', parsed.error.flatten())
    throw new Error('Invalid OAuth client payload from server')
  }
  return parsed.data
}

export async function getOAuthConnect(
  clientId: number,
  redirectUrl: string,
  originalPath: string | null,
  state: string | null,
): Promise<OAuthConnectResult> {
  const res = await apiClient.get<unknown>('/api/oauth/connect', {
    params: {
      client_id: clientId,
      redirect_url: redirectUrl,
      ...(originalPath ? { original_path: originalPath } : {}),
      ...(state ? { state } : {}),
    },
  })
  const parsed = OAuthConnectResultSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('oauth connect parse error', parsed.error.flatten())
    throw new Error('Invalid OAuth connect payload from server')
  }
  return parsed.data
}
