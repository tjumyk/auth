import { useQueryClient } from '@tanstack/react-query'
import { Alert, Anchor, Loader, Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { getLogout } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { PublicAuthCard, PublicAuthCenter } from '@/components/layout/PublicAuthShell'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'

export function LogoutPage(): React.ReactElement {
  const { t } = useI18n()
  useDocumentTitle(`${siteConfig.name} · ${t('signOutPageTitle')}`)
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

  if (phase === 'loading') {
    return (
      <PublicAuthCenter direction="column" gap="md">
        <Loader />
        <Text size="sm" c="dimmed" ta="center">
          {t('signingOut')}
        </Text>
      </PublicAuthCenter>
    )
  }

  return (
    <PublicAuthCard stackGap="md">
      <Title order={2}>{t('signOutHeading')}</Title>
      {phase === 'success' ? (
        <Stack gap="sm">
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
    </PublicAuthCard>
  )
}
