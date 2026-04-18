import { z } from 'zod'

import { apiClient } from '@/api/client'
import type { Group } from '@/models/user'
import {
  AdminGroupSchema,
  AdminOAuthClientSchema,
  AdminUserListEnvelopeSchema,
  AdminUserSchema,
  ConfirmEmailUrlResponseSchema,
  ExternalUserInfoResultSchema,
  IPInfoSchema,
  LoginRecordSchema,
  OAuthAuthorizationSchema,
  type AdminGroup,
  type AdminOAuthClient,
  type AdminUser,
  type ExternalUserInfoResult,
  type LoginRecord,
  type OAuthAuthorization,
} from '@/models/admin'

export const ADMIN_USERS_QK = ['admin', 'users'] as const
export const ADMIN_USER_QK = (uid: number, oauthInfo: boolean) =>
  ['admin', 'user', uid, oauthInfo] as const
export const ADMIN_USER_LOGIN_RECORDS_QK = (uid: number, country: boolean) =>
  ['admin', 'user', uid, 'loginRecords', country] as const
export const ADMIN_USER_EXT_INFO_QK = (uid: number) => ['admin', 'user', uid, 'extInfo'] as const
export const ADMIN_GROUPS_QK = ['admin', 'groups'] as const
export const ADMIN_GROUP_QK = (gid: number, oauthInfo: boolean) =>
  ['admin', 'group', gid, oauthInfo] as const
export const ADMIN_GROUP_USERS_QK = (gid: number) => ['admin', 'group', gid, 'users'] as const
export const ADMIN_OAUTH_CLIENTS_QK = ['admin', 'oauthClients'] as const
export const ADMIN_OAUTH_CLIENT_QK = (cid: number) => ['admin', 'oauthClient', cid] as const
export const ADMIN_OAUTH_CLIENT_AUTHS_QK = (cid: number) =>
  ['admin', 'oauthClient', cid, 'authorizations'] as const

function mergeAdminUserList(envelope: z.infer<typeof AdminUserListEnvelopeSchema>): AdminUser[] {
  const groupMap = new Map<number, Group>(
    envelope.groups.map((g) => [g.id, { id: g.id, name: g.name, description: g.description ?? null }]),
  )
  return envelope.users.map((u) => {
    const group_ids = u.group_ids ?? []
    const groups = group_ids
      .map((id) => groupMap.get(id))
      .filter((g): g is Group => g !== undefined)
    const merged = { ...u, groups }
    const parsed = AdminUserSchema.safeParse(merged)
    if (!parsed.success) {
      console.error('admin user merge parse error', parsed.error.flatten())
      throw new Error('Invalid admin user payload from server')
    }
    return parsed.data
  })
}

export async function fetchAdminUserList(): Promise<AdminUser[]> {
  const res = await apiClient.get<unknown>('/api/admin/users')
  const parsed = AdminUserListEnvelopeSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin user list parse error', parsed.error.flatten())
    throw new Error('Invalid admin user list payload from server')
  }
  return mergeAdminUserList(parsed.data)
}

export async function searchAdminUsersByName(name: string, limit?: number): Promise<AdminUser[]> {
  const res = await apiClient.get<unknown>('/api/admin/users', {
    params: { name, ...(limit !== undefined ? { limit } : {}) },
  })
  const parsed = z.array(AdminUserSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('admin user search parse error', parsed.error.flatten())
    throw new Error('Invalid admin user search payload from server')
  }
  return parsed.data
}

export type AdminInviteBody = {
  name: string
  email: string
  external_auth_provider_id?: string | null
  skip_email_confirmation?: boolean
}

export async function postAdminInviteUser(body: AdminInviteBody): Promise<AdminUser> {
  const res = await apiClient.post<unknown>('/api/admin/users', body)
  const parsed = AdminUserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin invite parse error', parsed.error.flatten())
    throw new Error('Invalid admin user payload from server')
  }
  return parsed.data
}

export async function getAdminUser(uid: number, oauthInfo = false): Promise<AdminUser> {
  const res = await apiClient.get<unknown>(`/api/admin/users/${uid}`, {
    params: oauthInfo ? { 'oauth-info': 'true' } : {},
  })
  const parsed = AdminUserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin user parse error', parsed.error.flatten())
    throw new Error('Invalid admin user payload from server')
  }
  return parsed.data
}

export async function getAdminUserExternalInfo(uid: number): Promise<ExternalUserInfoResult[]> {
  const res = await apiClient.get<unknown>(`/api/admin/users/${uid}/ext-info`)
  const parsed = z.array(ExternalUserInfoResultSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('admin ext info parse error', parsed.error.flatten())
    throw new Error('Invalid external user info payload from server')
  }
  return parsed.data
}

export async function getAdminImpersonateUser(uid: number): Promise<AdminUser> {
  const res = await apiClient.get<unknown>(`/api/admin/users/${uid}/impersonate`)
  const parsed = AdminUserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin impersonate parse error', parsed.error.flatten())
    throw new Error('Invalid admin user payload from server')
  }
  return parsed.data
}

export async function deleteAdminUser(uid: number): Promise<void> {
  await apiClient.delete(`/api/admin/users/${uid}`)
}

export async function getAdminUserByName(name: string, oauthInfo = false): Promise<AdminUser> {
  const res = await apiClient.get<unknown>(`/api/admin/user-by-name/${encodeURIComponent(name)}`, {
    params: oauthInfo ? { 'oauth-info': 'true' } : {},
  })
  const parsed = AdminUserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin user by name parse error', parsed.error.flatten())
    throw new Error('Invalid admin user payload from server')
  }
  return parsed.data
}

export async function deleteAdminUserByName(name: string): Promise<void> {
  await apiClient.delete(`/api/admin/user-by-name/${encodeURIComponent(name)}`)
}

export async function setAdminUserActive(uid: number, active: boolean): Promise<void> {
  if (active) {
    await apiClient.put(`/api/admin/users/${uid}/active`)
  } else {
    await apiClient.delete(`/api/admin/users/${uid}/active`)
  }
}

export async function putAdminUserNickname(uid: number, nickname: string): Promise<AdminUser> {
  const res = await apiClient.put<unknown>(`/api/admin/users/${uid}`, { nickname })
  const parsed = AdminUserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin user update parse error', parsed.error.flatten())
    throw new Error('Invalid admin user payload from server')
  }
  return parsed.data
}

export async function putAdminUserAvatar(uid: number, file: File): Promise<AdminUser> {
  const fd = new FormData()
  fd.append('avatar', file)
  const res = await apiClient.put<unknown>(`/api/admin/users/${uid}`, fd, {
    headers: { 'Content-Type': false },
  })
  const parsed = AdminUserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin user avatar parse error', parsed.error.flatten())
    throw new Error('Invalid admin user payload from server')
  }
  return parsed.data
}

export async function postAdminUserReconfirmEmail(uid: number): Promise<void> {
  await apiClient.post(`/api/admin/users/${uid}/reconfirm-email`)
}

export async function getAdminConfirmEmailUrl(uid: number): Promise<string> {
  const res = await apiClient.get<unknown>(`/api/admin/users/${uid}/confirm-email-url`)
  const parsed = ConfirmEmailUrlResponseSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('confirm email url parse error', parsed.error.flatten())
    throw new Error('Invalid confirm-email-url payload from server')
  }
  return parsed.data.url
}

export async function getAdminUserLoginRecords(
  uid: number,
  requireCountry = false,
): Promise<LoginRecord[]> {
  const res = await apiClient.get<unknown>(`/api/admin/users/${uid}/login-records`, {
    params: requireCountry ? { country: 'true' } : {},
  })
  const parsed = z.array(LoginRecordSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('login records parse error', parsed.error.flatten())
    throw new Error('Invalid login records payload from server')
  }
  return parsed.data
}

export async function fetchAdminGroups(): Promise<AdminGroup[]> {
  const res = await apiClient.get<unknown>('/api/admin/groups')
  const parsed = z.array(AdminGroupSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('admin groups parse error', parsed.error.flatten())
    throw new Error('Invalid admin groups payload from server')
  }
  return parsed.data
}

export async function searchAdminGroupsByName(name: string, limit?: number): Promise<AdminGroup[]> {
  const res = await apiClient.get<unknown>('/api/admin/groups', {
    params: { name, ...(limit !== undefined ? { limit } : {}) },
  })
  const parsed = z.array(AdminGroupSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('admin group search parse error', parsed.error.flatten())
    throw new Error('Invalid admin groups payload from server')
  }
  return parsed.data
}

export async function postAdminGroup(name: string, description: string): Promise<AdminGroup> {
  const res = await apiClient.post<unknown>('/api/admin/groups', { name, description })
  const parsed = AdminGroupSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin group create parse error', parsed.error.flatten())
    throw new Error('Invalid admin group payload from server')
  }
  return parsed.data
}

export async function getAdminGroup(gid: number, oauthInfo = false): Promise<AdminGroup> {
  const res = await apiClient.get<unknown>(`/api/admin/groups/${gid}`, {
    params: oauthInfo ? { 'oauth-info': 'true' } : {},
  })
  const parsed = AdminGroupSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin group parse error', parsed.error.flatten())
    throw new Error('Invalid admin group payload from server')
  }
  return parsed.data
}

export async function deleteAdminGroup(gid: number): Promise<void> {
  await apiClient.delete(`/api/admin/groups/${gid}`)
}

export async function putAdminGroupDescription(gid: number, description: string): Promise<AdminGroup> {
  const res = await apiClient.put<unknown>(`/api/admin/groups/${gid}`, { description })
  const parsed = AdminGroupSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin group update parse error', parsed.error.flatten())
    throw new Error('Invalid admin group payload from server')
  }
  return parsed.data
}

export async function getAdminGroupUsers(gid: number): Promise<AdminUser[]> {
  const res = await apiClient.get<unknown>(`/api/admin/groups/${gid}/users`)
  const parsed = z.array(AdminUserSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('admin group users parse error', parsed.error.flatten())
    throw new Error('Invalid admin group users payload from server')
  }
  return parsed.data
}

export async function adminGroupAddUser(gid: number, uid: number): Promise<void> {
  await apiClient.put(`/api/admin/groups/${gid}/users/${uid}`)
}

export async function adminGroupAddUserByName(gid: number, name: string): Promise<void> {
  await apiClient.put(`/api/admin/groups/${gid}/user-by-name/${encodeURIComponent(name)}`)
}

export async function adminGroupRemoveUser(gid: number, uid: number): Promise<void> {
  await apiClient.delete(`/api/admin/groups/${gid}/users/${uid}`)
}

export async function adminGroupRemoveUserByName(gid: number, name: string): Promise<void> {
  await apiClient.delete(`/api/admin/groups/${gid}/user-by-name/${encodeURIComponent(name)}`)
}

export async function fetchAdminOAuthClients(): Promise<AdminOAuthClient[]> {
  const res = await apiClient.get<unknown>('/api/admin/clients')
  const parsed = z.array(AdminOAuthClientSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('admin oauth clients parse error', parsed.error.flatten())
    throw new Error('Invalid OAuth clients payload from server')
  }
  return parsed.data
}

export async function postAdminOAuthClient(body: {
  name: string
  redirect_url: string
  home_url: string
  description: string
}): Promise<AdminOAuthClient> {
  const res = await apiClient.post<unknown>('/api/admin/clients', body)
  const parsed = AdminOAuthClientSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin oauth client create parse error', parsed.error.flatten())
    throw new Error('Invalid OAuth client payload from server')
  }
  return parsed.data
}

export async function getAdminOAuthClient(cid: number): Promise<AdminOAuthClient> {
  const res = await apiClient.get<unknown>(`/api/admin/clients/${cid}`)
  const parsed = AdminOAuthClientSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin oauth client parse error', parsed.error.flatten())
    throw new Error('Invalid OAuth client payload from server')
  }
  return parsed.data
}

export async function deleteAdminOAuthClient(cid: number): Promise<void> {
  await apiClient.delete(`/api/admin/clients/${cid}`)
}

export async function putAdminOAuthClientProfile(
  cid: number,
  body: { redirect_url: string; home_url: string; description: string },
): Promise<AdminOAuthClient> {
  const res = await apiClient.put<unknown>(`/api/admin/clients/${cid}`, body)
  const parsed = AdminOAuthClientSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin oauth client update parse error', parsed.error.flatten())
    throw new Error('Invalid OAuth client payload from server')
  }
  return parsed.data
}

export async function putAdminOAuthClientIcon(cid: number, file: File): Promise<AdminOAuthClient> {
  const fd = new FormData()
  fd.append('icon', file)
  // Instance default Content-Type is application/json; omit so the browser sends multipart (see putAccountAvatar).
  const res = await apiClient.put<unknown>(`/api/admin/clients/${cid}`, fd, {
    headers: { 'Content-Type': false },
  })
  const parsed = AdminOAuthClientSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('admin oauth client icon parse error', parsed.error.flatten())
    throw new Error('Invalid OAuth client payload from server')
  }
  return parsed.data
}

export async function setAdminOAuthClientPublic(cid: number, isPublic: boolean): Promise<void> {
  if (isPublic) {
    await apiClient.put(`/api/admin/clients/${cid}/public`)
  } else {
    await apiClient.delete(`/api/admin/clients/${cid}/public`)
  }
}

export async function postAdminOAuthClientRegenerateSecret(cid: number): Promise<void> {
  await apiClient.post(`/api/admin/clients/${cid}/regenerate-secret`)
}

export async function getAdminOAuthClientAuthorizations(cid: number): Promise<OAuthAuthorization[]> {
  const res = await apiClient.get<unknown>(`/api/admin/clients/${cid}/authorizations`)
  const parsed = z.array(OAuthAuthorizationSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('oauth authorizations parse error', parsed.error.flatten())
    throw new Error('Invalid OAuth authorizations payload from server')
  }
  return parsed.data
}

export async function adminOAuthClientAddAllowedGroup(cid: number, gid: number): Promise<void> {
  await apiClient.put(`/api/admin/clients/${cid}/allowed_groups/${gid}`)
}

export async function adminOAuthClientRemoveAllowedGroup(cid: number, gid: number): Promise<void> {
  await apiClient.delete(`/api/admin/clients/${cid}/allowed_groups/${gid}`)
}

export async function downloadAdminOAuthClientConfigFile(cid: number): Promise<void> {
  const res = await apiClient.get<Blob>(`/api/admin/clients/${cid}/generate-config-file`, {
    responseType: 'blob',
  })
  const cd = res.headers['content-disposition']
  let filename = 'oauth.config.json'
  if (cd) {
    const m = /filename="([^"]+)"/.exec(cd)
    if (m?.[1]) {
      filename = m[1]
    }
  }
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function lookupAdminIpInfo(
  ipAddr: string,
  resolveHostname = false,
): Promise<z.infer<typeof IPInfoSchema>> {
  const res = await apiClient.get<unknown>(`/api/admin/ip-info/${encodeURIComponent(ipAddr)}`, {
    params: resolveHostname ? { 'resolve-hostname': 'true' } : {},
  })
  const parsed = IPInfoSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('ip info parse error', parsed.error.flatten())
    throw new Error('Invalid IP info payload from server')
  }
  return parsed.data
}

const AdminSendEmailResponseSchema = z.object({
  num_recipients: z.number(),
})

export type AdminSendEmailBody = {
  subject: string
  body: string
  receivers?: string
  receiver_groups?: string
}

export async function postAdminSendEmail(body: AdminSendEmailBody): Promise<number> {
  const res = await apiClient.post<unknown>('/api/admin/send-email', body)
  const parsed = AdminSendEmailResponseSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('send email response parse error', parsed.error.flatten())
    throw new Error('Invalid send-email payload from server')
  }
  return parsed.data.num_recipients
}
