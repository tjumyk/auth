import { z } from 'zod'

import { apiClient } from '@/api/client'
import { OAuthClientSchema, type OAuthClient } from '@/models/oauthClient'
import { AccountMeUserSchema, UserSchema, type AccountMeUser, type User } from '@/models/user'

export const ACCOUNT_ME_QUERY_KEY = ['accountMe'] as const

export async function fetchWhoami(): Promise<User | null> {
  const res = await apiClient.get<unknown>('/api/account/whoami', {
    validateStatus: (s) => s === 200 || s === 204,
  })
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
): Promise<User> {
  const res = await apiClient.post<unknown>('/api/account/login', {
    name_or_email,
    password,
    remember,
  })
  const parsed = UserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('login parse error', parsed.error.flatten())
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

export async function fetchAccountMe(): Promise<AccountMeUser> {
  const res = await apiClient.get<unknown>('/api/account/me')
  const parsed = AccountMeUserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('account me parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export async function putAccountNickname(nickname: string): Promise<User> {
  const res = await apiClient.put<unknown>('/api/account/me', { nickname })
  const parsed = UserSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('update profile parse error', parsed.error.flatten())
    throw new Error('Invalid user payload from server')
  }
  return parsed.data
}

export async function putAccountAvatar(file: File): Promise<User> {
  const body = new FormData()
  body.append('avatar', file)
  const res = await apiClient.put<unknown>('/api/account/me', body)
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
