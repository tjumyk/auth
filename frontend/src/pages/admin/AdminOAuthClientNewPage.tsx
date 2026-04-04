import { Navigate } from 'react-router'

/**
 * @deprecated Do not add buttons or anchors to `/admin/oauth/clients/new`. Use the new-client modal
 * on {@link AdminOAuthClientsPage} instead. This route is kept for bookmarks and external links; it
 * redirects to the clients list and opens the modal.
 */
export function AdminOAuthClientNewPage(): React.ReactElement {
  return <Navigate to="/admin/oauth/clients" replace state={{ adminOpenNewOAuthClient: true }} />
}
