import { Navigate } from 'react-router'

/**
 * @deprecated Do not add buttons or anchors to `/admin/account/users/invite`. Use the invite modal
 * on {@link AdminUsersPage} instead. This route is kept for bookmarks and external links; it
 * redirects to the users list and opens the invite modal.
 */
export function AdminUserInvitePage(): React.ReactElement {
  return <Navigate to="/admin/account/users" replace state={{ adminOpenInvite: true }} />
}
