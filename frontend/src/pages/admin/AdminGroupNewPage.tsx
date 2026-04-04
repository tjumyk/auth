import { Navigate } from 'react-router'

/**
 * @deprecated Do not add buttons or anchors to `/admin/account/groups/new`. Use the new-group modal
 * on {@link AdminGroupsPage} instead. This route is kept for bookmarks and external links; it
 * redirects to the groups list and opens the modal.
 */
export function AdminGroupNewPage(): React.ReactElement {
  return <Navigate to="/admin/account/groups" replace state={{ adminOpenNewGroup: true }} />
}
