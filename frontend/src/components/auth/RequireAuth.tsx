import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Anchor,
  Center,
  Group,
  Loader,
  Stack,
  Text,
} from '@mantine/core'
import { type ReactNode, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router'

import { fetchWhoami } from '@/api/account'
import { AuthUserProvider } from '@/components/auth/AuthUserProvider'
import { ThemeLocaleToolbar } from '@/components/layout/ThemeLocaleToolbar'
import { useI18n } from '@/hooks/useI18n'
import { siteConfig } from '@/models/siteConfig'

export function RequireAuth({ children }: { children: ReactNode }): React.ReactElement {
  const { t } = useI18n()
  const location = useLocation()
  const q = useQuery({
    queryKey: ['whoami'],
    queryFn: fetchWhoami,
    staleTime: 0,
  })

  useEffect(() => {
    document.title = siteConfig.name
  }, [])

  if (q.isPending) {
    return (
      <Stack gap="md" p="md">
        <Group justify="flex-end">
          <ThemeLocaleToolbar />
        </Group>
        <Center mih="50vh">
          <Loader />
        </Center>
      </Stack>
    )
  }

  if (q.isError) {
    return (
      <Stack gap="md" p="md">
        <Group justify="flex-end">
          <ThemeLocaleToolbar />
        </Group>
        <Center mih="60vh">
          <Stack>
            <Alert color="red" title={t('sessionVerifyFailed')}>
              <Text size="sm">{t('sessionVerifyHint')}</Text>
              <Anchor component="button" type="button" onClick={() => q.refetch()} mt="sm">
                {t('retry')}
              </Anchor>
            </Alert>
          </Stack>
        </Center>
      </Stack>
    )
  }

  if (q.data === null) {
    const redirect = `${location.pathname}${location.search}`
    return <Navigate to={`/account/login?redirect=${encodeURIComponent(redirect)}`} replace />
  }

  return <AuthUserProvider user={q.data}>{children}</AuthUserProvider>
}
