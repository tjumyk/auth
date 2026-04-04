import type { ReactNode } from 'react'

import { AuthUserContext } from '@/contexts/authUserContext'
import type { User } from '@/models/user'

export function AuthUserProvider({
  user,
  children,
}: {
  user: User
  children: ReactNode
}): React.ReactElement {
  return <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>
}
