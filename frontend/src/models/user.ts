import { z } from 'zod'

export const GroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.union([z.string(), z.null()]).optional(),
})

export const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  nickname: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  is_active: z.boolean(),
  is_two_factor_enabled: z.boolean(),
  external_auth_provider_id: z.string().nullable().optional(),
  external_auth_enforced: z.boolean(),
  groups: z.array(GroupSchema).optional(),
})

export type Group = z.infer<typeof GroupSchema>
export type User = z.infer<typeof UserSchema>

/** GET `/api/account/me` includes absolute avatar URL for display. */
export const AccountMeUserSchema = UserSchema.extend({
  avatar_full: z.string().nullable().optional(),
})

export type AccountMeUser = z.infer<typeof AccountMeUserSchema>
