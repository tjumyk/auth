export function validateNewPassword(
  value: string,
  t: (key: string) => string,
): string | null {
  if (value.length === 0) return t('fieldRequired')
  if (value.length < 8) return t('passwordMinLength')
  if (value.length > 20) return t('passwordMaxLength')
  if (!/[a-z]/.test(value)) return t('passwordRequiresLowercase')
  if (!/[A-Z]/.test(value)) return t('passwordRequiresUppercase')
  if (!/[0-9]/.test(value)) return t('passwordRequiresDigit')
  return null
}

export function validateRepeatNewPassword(
  value: string,
  newPassword: string,
  t: (key: string) => string,
): string | null {
  if (value.length === 0) return t('fieldRequired')
  return value === newPassword ? null : t('passwordsDoNotMatch')
}
