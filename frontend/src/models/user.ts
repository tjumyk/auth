import { z } from 'zod'

export const PasswordExpiryStatusSchema = z.enum([
  'none',
  'warning_1month',
  'warning_1week',
  'expired',
])

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
  real_name: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  avatar_full: z.string().nullable().optional(),
  is_active: z.boolean(),
  is_two_factor_enabled: z.boolean(),
  external_auth_provider_id: z.string().nullable().optional(),
  external_auth_enforced: z.boolean(),
  password_expires_at: z.string().nullable().optional(),
  password_expiry_status: PasswordExpiryStatusSchema.optional(),
  password_expiry_intercept_active: z.boolean().optional(),
  groups: z.array(GroupSchema).optional(),
})

export type Group = z.infer<typeof GroupSchema>
export type User = z.infer<typeof UserSchema>

export const AccountMeUserSchema = UserSchema
export type AccountMeUser = User
