import { type ReactNode } from 'react'
import { Navigate } from 'react-router'

import { useAuthUser } from '@/hooks/useAuthUser'
import { isAdmin } from '@/utils/isAdmin'

export function RequireAdmin({ children }: { children: ReactNode }): React.ReactElement {
  const user = useAuthUser()
  if (!isAdmin(user)) {
    return <Navigate to="/forbidden" replace />
  }
  return <>{children}</>
}
