import type { BasicError } from '@/models/apiError'

export function isPasswordExpiredError(error: BasicError | null): boolean {
  return error?.code === 'password_expired' || error?.msg === 'password expired'
}

export function formatPasswordServiceError(
  error: BasicError | null,
  t: (key: string) => string,
): { title: string; detail?: string } | null {
  if (!error) {
    return null
  }
  if (error.msg === 'password recently used') {
    return { title: t('passwordRecentlyUsed'), detail: error.detail ?? undefined }
  }
  if (isPasswordExpiredError(error)) {
    return { title: t('passwordExpiryLoginExpiredTitle'), detail: t('passwordExpiryLoginExpiredBody') }
  }
  return { title: error.msg, detail: error.detail ?? undefined }
}
