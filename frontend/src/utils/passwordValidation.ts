export function validateNewPassword(
  value: string,
  t: (key: string) => string,
): string | null {
  if (value.length === 0) return t('fieldRequired')
  if (value.length < 8) return t('passwordMinLength')
  if (value.length > 64) return t('passwordMaxLength')

  let classes = 0
  if (/[a-z]/.test(value)) classes += 1
  if (/[A-Z]/.test(value)) classes += 1
  if (/[0-9]/.test(value)) classes += 1
  if (/[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E]/.test(value)) classes += 1
  if (classes < 3) return t('passwordRequiresThreeClasses')

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
