import { useMemo } from 'react'
import { useSearchParams } from 'react-router'

/** Same-origin path only; rejects protocol-relative and absolute URLs. */
export function safeRedirectPath(raw: string | null): string {
  if (!raw || raw.length === 0) {
    return '/'
  }
  const t = raw.trim()
  if (t.startsWith('//') || t.includes('://')) {
    return '/'
  }
  if (!t.startsWith('/')) {
    return '/'
  }
  return t
}

export function useSafeRedirectPath(): string {
  const [params] = useSearchParams()
  return useMemo(() => safeRedirectPath(params.get('redirect')), [params])
}
