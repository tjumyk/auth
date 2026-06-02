import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'

import { store } from '@/app/store'
import { I18nProvider } from '@/i18n'
import { forcedColorScheme } from '@/models/uiConfig'
import { theme } from '@/theme'

const colorSchemeProviderProps = forcedColorScheme
  ? { forceColorScheme: forcedColorScheme }
  : { defaultColorScheme: 'auto' as const }

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ColorSchemeScript {...colorSchemeProviderProps} />
        <MantineProvider theme={theme} {...colorSchemeProviderProps}>
          <Notifications position="top-right" autoClose={4000} zIndex={4000} />
          <I18nProvider>{children}</I18nProvider>
        </MantineProvider>
      </QueryClientProvider>
    </Provider>
  )
}
