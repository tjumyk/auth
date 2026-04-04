import { z } from 'zod'

export const OAuthClientSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_public: z.boolean(),
  home_url: z.string(),
  description: z.union([z.string(), z.null()]),
  icon: z.union([z.string(), z.null()]),
  _is_ip_blocked: z.boolean().optional(),
})

export type OAuthClient = z.infer<typeof OAuthClientSchema>
