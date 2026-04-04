import { useContext } from 'react'

import { AuthUserContext } from '@/contexts/authUserContext'
import type { User } from '@/models/user'

export function useAuthUser(): User {
  const ctx = useContext(AuthUserContext)
  if (!ctx) {
    throw new Error('useAuthUser must be used within AuthUserProvider')
  }
  return ctx
}
