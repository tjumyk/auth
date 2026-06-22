import type { User } from '@/models/user'

export function shouldInterceptPasswordExpiry(user: User | null | undefined): boolean {
  return user?.password_expiry_intercept_active === true
}

export type PasswordExpiryStatus = 'none' | 'warning_1month' | 'warning_1week' | 'expired'

export function formatPasswordExpiryDate(
  expiresAt: string | null | undefined,
  locale: string,
): string {
  if (!expiresAt) return ''
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return expiresAt
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
