import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider } from '@mantine/core'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter, type MemoryRouterProps } from 'react-router'
import type { ReactElement, ReactNode } from 'react'

import { AuthUserProvider } from '@/components/auth/AuthUserProvider'
import { I18nProvider } from '@/i18n'
import type { User } from '@/models/user'
import { theme } from '@/theme'

const defaultUser: User = {
  id: 1,
  name: 'tester',
  email: 'tester@example.com',
  nickname: null,
  avatar: null,
  is_active: true,
  is_two_factor_enabled: false,
  external_auth_enforced: false,
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

export function renderWithApp(
  ui: ReactElement,
  options?: {
    router?: MemoryRouterProps
    user?: User
    queryClient?: QueryClient
  } & Omit<RenderOptions, 'wrapper'>,
): ReturnType<typeof render> {
  const queryClient = options?.queryClient ?? createTestQueryClient()
  const user = options?.user ?? defaultUser

  function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={queryClient}>
        <MantineProvider theme={theme}>
          <I18nProvider>
            <AuthUserProvider user={user}>
              <MemoryRouter {...options?.router}>{children}</MemoryRouter>
            </AuthUserProvider>
          </I18nProvider>
        </MantineProvider>
      </QueryClientProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}

export function mockWindowLocation(): { href: string } {
  const state = { href: 'http://localhost/' }
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      get href() {
        return state.href
      },
      set href(value: string) {
        state.href = value
      },
      assign(value: string) {
        state.href = value
      },
      replace(value: string) {
        state.href = value
      },
    },
  })
  return state
}
