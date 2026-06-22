import { z } from 'zod'

import { apiClient, getBasicErrorFromUnknown } from '@/api/client'
import type { BasicError } from '@/models/apiError'
import { parseBasicErrorFromUnknown } from '@/models/apiError'
import type { IpCheckResult } from '@/utils/enrichOAuthClientsWithIpCheck'
import { OAuthClientSchema, type OAuthClient } from '@/models/oauthClient'
import {
  ExternalAuthProviderSchema,
  type ExternalAuthProvider,
} from '@/models/externalAuthProvider'
import { TwoFactorSetupResponseSchema, type TwoFactorSetupResponse } from '@/models/twoFactor'
import { AccountMeUserSchema, UserSchema, type AccountMeUser, type User } from '@/models/user'

export const ACCOUNT_ME_QUERY_KEY = ['accountMe'] as const

export const IP_CHECK_QUERY_KEY = ['ipCheck'] as const

export async function fetchIpCheck(): Promise<IpCheckResult | null> {
  const res = await apiClient.get<unknown>('/api/account/ip-check', {
    validateStatus: (s) => s === 200 || s === 204 || s === 500,
  })
  if (res.status === 204 || res.status === 500) {
    return null
  }
  const d = res.data as { check_pass?: unknown; guarded_ports?: unknown }
  return {
    check_pass: d.check_pass === true,
    guarded_ports: Array.isArray(d.guarded_ports)
      ? (d.guarded_ports as unknown[]).filter((p): p is number => typeof p === 'number')
      : [],
  }
}

export class PasswordExpiredWhoamiError extends Error {
  readonly basicError: BasicError

  constructor(basicError: BasicError) {
    super(basicError.msg)
    this.name = 'PasswordExpiredWhoamiError'
    this.basicError = basicError
  }
}

export async function fetchWhoami(): Promise<User | null> {
  const res = await apiClient.get<unknown>('/api/account/whoami', {
    validateStatus: (s) => s === 200 || s === 204 || s === 401,
  })
  if (res.status === 401) {
    const basic = parseBasicErrorFromUnknown(res.data)
    if (basic?.code === 'password_expired') {
      throw new PasswordExpiredWhoamiError(basic)
    }
    throw new Error(basic?.msg ?? 'Session verification failed')
  }
  if (res.status === 204) {
    return null
  }
  const parsed = UserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('whoami parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export async function fetchMyOAuthClients(): Promise<OAuthClient[]> {
  const res = await apiClient.get<unknown>('/api/account/clients')
  const parsed = z.array(OAuthClientSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('clients parse error', parsed.error.flatten())
    throw new Error('Invalid OAuth clients payload from server')
  }
  return parsed.data
}

export async function postLogin(
  name_or_email: string,
  password: string,
  remember: boolean,
  captcha?: { challenge_id: string; answer: string },
): Promise<User> {
  const body: Record<string, unknown> = {
    name_or_email,
    password,
    remember,
  }
  if (captcha) {
    body.captcha_challenge_id = captcha.challenge_id
    body.captcha_answer = captcha.answer
  }
  const res = await apiClient.post<unknown>('/api/account/login', body)
  const parsed = UserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('login parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export async function postPasswordExpirySkip(): Promise<User> {
  const res = await apiClient.post<unknown>('/api/account/password-expiry/skip')
  const parsed = UserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('password expiry skip parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export async function postTwoFactorLogin(token: string, remember: boolean): Promise<User> {
  const res = await apiClient.post<unknown>('/api/account/two-factor/login', {
    token,
    remember,
  })
  const parsed = UserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('2fa login parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export async function getLogout(): Promise<void> {
  await apiClient.get('/api/account/logout')
}

export async function fetchExternalAuthProviders(): Promise<ExternalAuthProvider[]> {
  const res = await apiClient.get<unknown>('/api/account/external-auth-providers')
  const parsed = z.array(ExternalAuthProviderSchema).safeParse(res.data)
  if (!parsed.success) {
    console.error('external auth providers parse error', parsed.error.flatten())
    throw new Error('Invalid external auth providers payload from server')
  }
  return parsed.data
}

export async function fetchExternalAuthProvider(pid: string): Promise<ExternalAuthProvider> {
  const res = await apiClient.get<unknown>(`/api/account/external-auth-providers/${encodeURIComponent(pid)}`)
  const parsed = ExternalAuthProviderSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('external auth provider parse error', parsed.error.flatten())
    throw new Error('Invalid external auth provider payload from server')
  }
  return parsed.data
}

export async function fetchAccountMe(): Promise<AccountMeUser> {
  const res = await apiClient.get<unknown>('/api/account/me')
  const parsed = AccountMeUserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('account me parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export type AccountProfilePatch = {
  nickname?: string
  real_name?: string
  mobile?: string
}

export async function putAccountProfile(patch: AccountProfilePatch): Promise<User> {
  const res = await apiClient.put<unknown>('/api/account/me', patch)
  const parsed = UserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('update profile parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export async function putAccountNickname(nickname: string): Promise<User> {
  return putAccountProfile({ nickname })
}

export async function putAccountAvatar(file: File): Promise<User> {
  const body = new FormData()
  body.append('avatar', file)
  // Instance default Content-Type is application/json; axios would stringify FormData to JSON
  // (losing the file) before the adapter clears the header. Omit so the browser sends multipart.
  const res = await apiClient.put<unknown>('/api/account/me', body, {
    headers: { 'Content-Type': false },
  })
  const parsed = UserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('update avatar parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export async function putAccountPassword(old_password: string, new_password: string): Promise<void> {
  await apiClient.put('/api/account/me/password', { old_password, new_password })
}

export async function fetchTwoFactorSetup(): Promise<TwoFactorSetupResponse> {
  const res = await apiClient.get<unknown>('/api/account/two-factor/setup')
  const parsed = TwoFactorSetupResponseSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('two-factor setup parse error', parsed.error.flatten())
    throw new Error('Invalid two-factor setup payload from server')
  }
  return parsed.data
}

export async function postTwoFactorConfirmSetup(token: string): Promise<void> {
  await apiClient.post('/api/account/two-factor/confirm-setup', { token })
}

export async function postTwoFactorDisable(token: string): Promise<void> {
  await apiClient.post('/api/account/two-factor/disable', { token })
}

export async function getRequestDisableTwoFactorByEmail(): Promise<void> {
  await apiClient.get('/api/account/two-factor/request-disable-by-email')
}

export async function getDisableTwoFactorByEmail(uid: number, token: string): Promise<void> {
  await apiClient.get('/api/account/two-factor/disable-by-email', {
    params: { uid, token },
  })
}

export async function postRegister(name: string, email: string): Promise<void> {
  await apiClient.post('/api/account/register', { name, email })
}

export type RequestResetPasswordResult =
  | { kind: 'email_sent' }
  | { kind: 'external_provider'; provider: ExternalAuthProvider }

export async function postRequestResetPassword(
  name_or_email: string,
): Promise<RequestResetPasswordResult> {
  const res = await apiClient.post<unknown>(
    '/api/account/request-reset-password',
    { name_or_email },
    { validateStatus: (s) => s === 200 || s === 204 },
  )
  if (res.status === 204) {
    return { kind: 'email_sent' }
  }
  const parsed = ExternalAuthProviderSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('request reset password parse error', parsed.error.flatten())
    throw new Error('Invalid external auth provider payload from server')
  }
  return { kind: 'external_provider', provider: parsed.data }
}

export async function postRequestReconfirmEmail(name_or_email: string): Promise<void> {
  await apiClient.post('/api/account/request-reconfirm-email', { name_or_email })
}

export async function getResetPasswordVerify(uid: number, token: string): Promise<User> {
  const res = await apiClient.get<unknown>('/api/account/reset-password', {
    params: { uid, token },
  })
  const parsed = UserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('reset-password verify parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export async function postResetPasswordCommit(
  uid: number,
  token: string,
  new_password: string,
): Promise<void> {
  await apiClient.post('/api/account/reset-password', { new_password }, { params: { uid, token } })
}

export type ConfirmEmailVerifyResult =
  | { kind: 'user'; user: User }
  | { kind: 'already_confirmed' }

export async function getConfirmEmailVerify(
  uid: number,
  token: string,
): Promise<ConfirmEmailVerifyResult> {
  try {
    const res = await apiClient.get<unknown>('/api/account/confirm-email', {
      params: { uid, token },
    })
    const parsed = UserSchema.safeParse(res.data)
    if (!parsed.success) {
      console.error('confirm-email verify parse error', parsed.error.flatten())
      throw new Error('Invalid user payload from server')
    }
    return { kind: 'user', user: parsed.data }
  } catch (e) {
    const be = getBasicErrorFromUnknown(e)
    if (be?.msg === 'already confirmed') {
      return { kind: 'already_confirmed' }
    }
    throw e
  }
}

export async function postConfirmEmailFinish(
  uid: number,
  token: string,
  new_password: string | null,
): Promise<void> {
  await apiClient.post('/api/account/confirm-email', { new_password }, { params: { uid, token } })
}
