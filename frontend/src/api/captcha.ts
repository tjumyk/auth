import { isAxiosError } from 'axios'

import { apiClient } from '@/api/client'
import { withAppBasePath } from '@/utils/appBasePath'
import {
  CaptchaCheckSchema,
  ChallengeCreatedSchema,
  LoginGuardSchema,
} from '@/models/captcha'

export class CaptchaRateLimitError extends Error {
  constructor() {
    super('Captcha rate limited')
    this.name = 'CaptchaRateLimitError'
  }
}

export async function fetchLoginGuard(nameOrEmail?: string): Promise<boolean> {
  const params = nameOrEmail?.trim() ? { name_or_email: nameOrEmail.trim() } : undefined
  const res = await apiClient.get<unknown>('/api/account/login-guard', { params })
  const parsed = LoginGuardSchema.safeParse(res.data)
  if (!parsed.success) {
    return false
  }
  return parsed.data.captcha_required
}

export async function createCaptchaChallenge(): Promise<string> {
  try {
    const res = await apiClient.post<unknown>('/api/captcha/v1/challenges')
    const parsed = ChallengeCreatedSchema.safeParse(res.data)
    if (!parsed.success) {
      throw new Error('Invalid captcha challenge response')
    }
    return parsed.data.challenge_id
  } catch (err: unknown) {
    if (isAxiosError(err) && err.response?.status === 429) {
      throw new CaptchaRateLimitError()
    }
    throw err
  }
}

export async function checkCaptchaAnswer(
  challengeId: string,
  answer: string,
): Promise<boolean> {
  const res = await apiClient.post<unknown>('/api/account/captcha-check', {
    captcha_challenge_id: challengeId,
    captcha_answer: answer,
  })
  const parsed = CaptchaCheckSchema.safeParse(res.data)
  if (!parsed.success) {
    return false
  }
  return parsed.data.valid
}

export function captchaImageUrl(challengeId: string, cacheBust?: number): string {
  const path = `/api/captcha/v1/challenges/${encodeURIComponent(challengeId)}/image`
  const base = withAppBasePath(path)
  if (cacheBust === undefined) {
    return base
  }
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}t=${cacheBust}`
}
