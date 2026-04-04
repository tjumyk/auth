import { createBrowserRouter } from 'react-router'

import { RequireAuth } from '@/components/auth/RequireAuth'
import { AppShellLayout } from '@/components/layout/AppShellLayout'
import { HomePage } from '@/pages/HomePage'
import { ProfilePage } from '@/pages/ProfilePage'
import { LoginPage } from '@/pages/LoginPage'
import { LogoutPage } from '@/pages/LogoutPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

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
        ],
      },
      { path: 'account/login', element: <LoginPage /> },
      { path: 'account/logout', element: <LogoutPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
