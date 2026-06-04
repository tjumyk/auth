import { z } from 'zod'

export const LoginGuardSchema = z.object({
  captcha_required: z.boolean(),
})

export type LoginGuard = z.infer<typeof LoginGuardSchema>

export const ChallengeCreatedSchema = z.object({
  challenge_id: z.string(),
})

export type ChallengeCreated = z.infer<typeof ChallengeCreatedSchema>

export const CaptchaCheckSchema = z.object({
  valid: z.boolean(),
})

export type CaptchaCheck = z.infer<typeof CaptchaCheckSchema>
