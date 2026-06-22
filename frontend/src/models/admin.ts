import { z } from 'zod'

import { BasicErrorSchema } from '@/models/apiError'
import { GroupSchema } from '@/models/user'

export const OAuthClientSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  is_public: z.boolean(),
  home_url: z.string(),
  description: z.union([z.string(), z.null()]),
  icon: z.union([z.string(), z.null()]),
})

export const OAuthAuthorizationSchema = z.object({
  client_id: z.number(),
  user_id: z.number(),
  created_at: z.string(),
  modified_at: z.string(),
  client: OAuthClientSummarySchema.optional(),
  user: z
    .object({
      id: z.number(),
      name: z.string(),
      email: z.string(),
    })
    .optional(),
})

export type OAuthAuthorization = z.infer<typeof OAuthAuthorizationSchema>

export const IPCountryInfoSchema = z.object({
  name: z.string(),
  iso_code: z.string(),
})

export const LoginRecordSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  time: z.string(),
  ip: z.string(),
  user_agent: z.string(),
  success: z.boolean(),
  reason: z.union([z.string(), z.null()]).optional(),
  country: IPCountryInfoSchema.optional(),
})

export type LoginRecord = z.infer<typeof LoginRecordSchema>

export const AdminUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  nickname: z.string().nullable().optional(),
  real_name: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
  is_active: z.boolean(),
  is_two_factor_enabled: z.boolean(),
  external_auth_provider_id: z.string().nullable().optional(),
  external_auth_enforced: z.boolean(),
  groups: z.array(GroupSchema).optional(),
  group_ids: z.array(z.number()).optional(),
  created_at: z.string(),
  modified_at: z.string(),
  email_confirmed_at: z.union([z.string(), z.null()]).optional(),
  is_email_confirmed: z.boolean(),
  password_changed_at: z.string().nullable().optional(),
  password_expires_at: z.string().nullable().optional(),
  password_expiry_status: z.enum(['none', 'warning_1month', 'warning_1week', 'expired']).optional(),
  authorizations: z.array(OAuthAuthorizationSchema).optional(),
})

export type AdminUser = z.infer<typeof AdminUserSchema>

export const AdminUserListEnvelopeSchema = z.object({
  users: z.array(
    AdminUserSchema.omit({ groups: true }).extend({
      group_ids: z.array(z.number()),
    }),
  ),
  groups: z.array(
    GroupSchema.extend({
      created_at: z.string(),
      modified_at: z.string(),
    }),
  ),
})

export type AdminUserListEnvelope = z.infer<typeof AdminUserListEnvelopeSchema>

export const AdminGroupSchema = GroupSchema.extend({
  created_at: z.string(),
  modified_at: z.string(),
  user_ids: z.array(z.number()).optional(),
  allowed_clients: z.array(OAuthClientSummarySchema).optional(),
})

export type AdminGroup = z.infer<typeof AdminGroupSchema>

export const AdminOAuthClientSchema = z.object({
  id: z.number(),
  name: z.string(),
  secret: z.string(),
  redirect_url: z.string(),
  home_url: z.string(),
  is_public: z.boolean(),
  description: z.union([z.string(), z.null()]),
  icon: z.union([z.string(), z.null()]),
  created_at: z.string(),
  modified_at: z.string(),
  allowed_groups: z.array(GroupSchema),
})

export type AdminOAuthClient = z.infer<typeof AdminOAuthClientSchema>

export const ExternalUserInfoResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  result: z.unknown().optional(),
  error: BasicErrorSchema.optional(),
})

export type ExternalUserInfoResult = z.infer<typeof ExternalUserInfoResultSchema>

export const ConfirmEmailUrlResponseSchema = z.object({
  url: z.string(),
})

export const SendEmailResponseSchema = z.object({
  num_recipients: z.number(),
})

export const IPInfoSchema = z.object({
  country: z.string().optional(),
  country_code: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  postal_code: z.string().optional(),
  asn: z.number().optional(),
  organization: z.string().optional(),
  hostname: z.string().optional(),
})

export type IPInfo = z.infer<typeof IPInfoSchema>
