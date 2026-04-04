import { z } from 'zod'

export const TwoFactorSetupResponseSchema = z.object({
  qr_code: z.string(),
})

export type TwoFactorSetupResponse = z.infer<typeof TwoFactorSetupResponseSchema>
