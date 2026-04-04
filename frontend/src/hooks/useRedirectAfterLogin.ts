import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import type { User } from '@/models/user'

import { useSafeRedirectPath } from '@/hooks/useSafeRedirectPath'

/** When `user` is set (e.g. already logged in on login page), navigate to safe `?redirect=` or `/`. */
export function useRedirectAfterLogin(user: User | null | undefined): void {
  const navigate = useNavigate()
  const redirect = useSafeRedirectPath()

  useEffect(() => {
    if (user) {
      navigate(redirect, { replace: true })
    }
  }, [user, navigate, redirect])
}
