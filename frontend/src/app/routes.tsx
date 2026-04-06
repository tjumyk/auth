import { createBrowserRouter, Navigate } from 'react-router'

import { RequireAdmin } from '@/components/auth/RequireAdmin'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { AppShellLayout } from '@/components/layout/AppShellLayout'
import { PublicAuthRouteLayout } from '@/components/layout/PublicAuthRouteLayout'
import { AdminAboutPage } from '@/pages/admin/AdminAboutPage'
import { AdminBatchUsersPage } from '@/pages/admin/AdminBatchUsersPage'
import { AdminGroupEditPage } from '@/pages/admin/AdminGroupEditPage'
import { AdminGroupNewPage } from '@/pages/admin/AdminGroupNewPage'
import { AdminGroupsPage } from '@/pages/admin/AdminGroupsPage'
import { AdminOAuthClientEditPage } from '@/pages/admin/AdminOAuthClientEditPage'
import { AdminOAuthClientNewPage } from '@/pages/admin/AdminOAuthClientNewPage'
import { AdminOAuthClientsPage } from '@/pages/admin/AdminOAuthClientsPage'
import { AdminSendEmailPage } from '@/pages/admin/AdminSendEmailPage'
import { AdminUserEditPage } from '@/pages/admin/AdminUserEditPage'
import { AdminUserInvitePage } from '@/pages/admin/AdminUserInvitePage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { ConfirmEmailPage } from '@/pages/ConfirmEmailPage'
import { DisableTwoFactorByEmailPage } from '@/pages/DisableTwoFactorByEmailPage'
import { ForbiddenPage } from '@/pages/ForbiddenPage'
import { HomePage } from '@/pages/HomePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { LoginPage } from '@/pages/LoginPage'
import { LogoutPage } from '@/pages/LogoutPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { OAuthLoginPage } from '@/pages/OAuthLoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { RequestDisableTwoFactorPage } from '@/pages/RequestDisableTwoFactorPage'
import { RequestReconfirmEmailPage } from '@/pages/RequestReconfirmEmailPage'
import { RequestResetPasswordPage } from '@/pages/RequestResetPasswordPage'
import { TwoFactorSettingsPage } from '@/pages/TwoFactorSettingsPage'
import type { AppLocationScrollState } from '@/models/locationScrollState'

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      {
        element: (
          <RequireAuth>
            <AppShellLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <HomePage /> },
          { path: 'account/profile', element: <ProfilePage /> },
          { path: 'account/two-factor', element: <TwoFactorSettingsPage /> },
          /* Legacy Angular paths → canonical routes (+ scroll state where needed) */
          {
            path: 'settings',
            element: <Navigate to="/account/profile" replace />,
          },
          {
            path: 'settings/profile',
            element: <Navigate to="/account/profile" replace />,
          },
          {
            path: 'settings/password',
            element: (
              <Navigate
                to="/account/profile"
                replace
                state={{ scrollTo: 'password' } satisfies AppLocationScrollState}
              />
            ),
          },
          {
            path: 'settings/two-factor',
            element: <Navigate to="/account/two-factor" replace />,
          },
        ],
      },
      {
        path: 'admin',
        element: (
          <RequireAuth>
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="account/users" replace /> },
          {
            path: 'account',
            children: [
              { index: true, element: <Navigate to="users" replace /> },
              {
                path: 'users',
                children: [
                  { index: true, element: <AdminUsersPage /> },
                  { path: 'u/:uid', element: <AdminUserEditPage /> },
                  /* Deprecated: use invite modal on AdminUsersPage; see AdminUserInvitePage. */
                  { path: 'invite', element: <AdminUserInvitePage /> },
                  {
                    path: 'batch',
                    element: <AdminBatchUsersPage />,
                  },
                ],
              },
              {
                path: 'groups',
                children: [
                  { index: true, element: <AdminGroupsPage /> },
                  { path: 'g/:gid', element: <AdminGroupEditPage /> },
                  /* Deprecated: use new-group modal on AdminGroupsPage; see AdminGroupNewPage. */
                  { path: 'new', element: <AdminGroupNewPage /> },
                ],
              },
            ],
          },
          {
            path: 'oauth',
            children: [
              { index: true, element: <Navigate to="clients" replace /> },
              {
                path: 'clients',
                children: [
                  { index: true, element: <AdminOAuthClientsPage /> },
                  { path: 'c/:cid', element: <AdminOAuthClientEditPage /> },
                  /* Deprecated: use new-client modal on AdminOAuthClientsPage; see AdminOAuthClientNewPage. */
                  { path: 'new', element: <AdminOAuthClientNewPage /> },
                ],
              },
            ],
          },
          {
            path: 'email',
            children: [
              { index: true, element: <Navigate to="send" replace /> },
              {
                path: 'send',
                element: <AdminSendEmailPage />,
              },
            ],
          },
          { path: 'about', element: <AdminAboutPage /> },
        ],
      },
      {
        element: <PublicAuthRouteLayout />,
        children: [
          { path: 'account/login', element: <LoginPage /> },
          { path: 'account/register', element: <RegisterPage /> },
          {
            path: 'account/request-reset-password',
            element: <RequestResetPasswordPage />,
          },
          {
            path: 'account/request-reconfirm-email',
            element: <RequestReconfirmEmailPage />,
          },
          { path: 'account/reset-password', element: <ResetPasswordPage /> },
          { path: 'account/confirm-email', element: <ConfirmEmailPage /> },
          { path: 'account/logout', element: <LogoutPage /> },
          { path: 'oauth/login', element: <OAuthLoginPage /> },
          {
            path: 'account/request-disable-two-factor-by-email',
            element: <RequestDisableTwoFactorPage />,
          },
          {
            path: 'account/disable-two-factor-by-email',
            element: <DisableTwoFactorByEmailPage />,
          },
        ],
      },
      { path: 'forbidden', element: <ForbiddenPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
