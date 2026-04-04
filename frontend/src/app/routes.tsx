import { createBrowserRouter } from 'react-router'

import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShellLayout } from '@/components/layout/AppShellLayout'
import { PublicAuthRouteLayout } from '@/components/layout/PublicAuthRouteLayout'
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
