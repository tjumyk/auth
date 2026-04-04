import { useQueryClient } from '@tanstack/react-query'
import { Alert, Anchor, Center, Container, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { getLogout } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { ThemeLocaleToolbar } from '@/components/layout/ThemeLocaleToolbar'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'

export function LogoutPage(): React.ReactElement {
  const { t } = useI18n()
  useDocumentTitle(t('signOutPageTitle'))
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<'loading' | 'success' | 'error'>('loading')
  const [err, setErr] = useState<BasicError | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await getLogout()
        if (!cancelled) {
          queryClient.setQueryData(['whoami'], null)
          queryClient.removeQueries({ queryKey: ['myOAuthClients'] })
          setPhase('success')
        }
      } catch (e) {
        if (!cancelled) {
          setErr(getBasicErrorFromUnknown(e))
          setPhase('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [queryClient])

  return (
    <Container size="xs" py="xl">
      <Group justify="flex-end" mb="md">
        <ThemeLocaleToolbar />
      </Group>
      <Title order={2} mb="lg">
        {t('signOutHeading')}
      </Title>
      {phase === 'loading' ? (
        <Center py="xl">
          <Stack align="center" gap="sm">
            <Loader />
            <Text size="sm" c="dimmed">
              {t('signingOut')}
            </Text>
          </Stack>
        </Center>
      ) : null}
      {phase === 'success' ? (
        <Stack>
          <Text>{t('signedOutMessage')}</Text>
          <Anchor component={Link} to="/account/login">
            {t('signInAgain')}
          </Anchor>
        </Stack>
      ) : null}
      {phase === 'error' && err ? (
        <Alert color="red" title={err.msg}>
          {err.detail}
        </Alert>
      ) : null}
    </Container>
  )
}
