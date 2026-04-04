import { z } from 'zod'

export const ExternalAuthProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  update_password_url: z.string().optional(),
  reset_password_url: z.string().optional(),
})

export type ExternalAuthProvider = z.infer<typeof ExternalAuthProviderSchema>
