/** Must stay aligned with utils/email_validation.py */
export const EMAIL_MAX_LENGTH = 64

const EMAIL_PATTERN =
  /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

export function isValidEmail(email: string): boolean {
  const s = email.trim()
  if (s.length === 0 || s.length > EMAIL_MAX_LENGTH) {
    return false
  }
  return EMAIL_PATTERN.test(s)
}
