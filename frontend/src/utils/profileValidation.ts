import { getBasicErrorFromUnknown } from '@/api/client'
import type { BasicError } from '@/models/apiError'

// eslint-disable-next-line no-control-regex -- reject control chars in profile text fields
const CONTROL_CHAR = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/

export const NICKNAME_MIN = 3
export const NICKNAME_MAX = 16
export const REAL_NAME_MIN = 2
export const REAL_NAME_MAX = 64

export function normalizeMobile(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const stripped = trimmed.replace(/[\s\-()]/g, '')
  if (!stripped) return null
  const plusCount = (stripped.match(/\+/g) ?? []).length
  if (plusCount > 1 || (stripped.includes('+') && !stripped.startsWith('+'))) {
    return null
  }
  if (!/^\+?[0-9]{7,20}$/.test(stripped)) {
    return null
  }
  return stripped
}

export function validateNickname(
  value: string,
  t: (key: string) => string,
): string | null {
  const v = value.trim()
  if (!v) return t('nicknameMinLength')
  if (v.length < NICKNAME_MIN) return t('nicknameMinLength')
  if (v.length > NICKNAME_MAX) return t('nicknameMaxLength')
  if (CONTROL_CHAR.test(v)) return t('nicknameInvalid')
  return null
}

export function validateRealName(
  value: string,
  t: (key: string) => string,
): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.length < REAL_NAME_MIN) return t('realNameMinLength')
  if (v.length > REAL_NAME_MAX) return t('realNameMaxLength')
  if (CONTROL_CHAR.test(v)) return t('realNameInvalid')
  return null
}

export function validateMobile(
  value: string,
  t: (key: string) => string,
): string | null {
  const v = value.trim()
  if (!v) return null
  const normalized = normalizeMobile(v)
  if (normalized === null) return t('mobileInvalid')
  return null
}

export function mapProfileApiMessage(msg: string, t: (key: string) => string): string {
  if (msg === 'duplicate mobile') return t('mobileDuplicate')
  return msg
}

export function profileErrorFromUnknown(err: unknown, t: (key: string) => string): BasicError {
  const basic = getBasicErrorFromUnknown(err)
  return {
    msg: mapProfileApiMessage(basic?.msg ?? 'error', t),
    detail: basic?.detail,
  }
}
