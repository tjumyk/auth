import { Outlet } from 'react-router'

import { PublicAuthShell } from '@/components/layout/PublicAuthShell'

/** Router layout: shared public-auth backdrop + toolbar; child routes render in the outlet. */
export function PublicAuthRouteLayout(): React.ReactElement {
  return (
    <PublicAuthShell>
      <Outlet />
    </PublicAuthShell>
  )
}
