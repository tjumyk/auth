import { useQuery } from '@tanstack/react-query'
import { Alert, Anchor, Loader, Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'

import { getDisableTwoFactorByEmail } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { PublicAuthCard, PublicAuthCenter } from '@/components/layout/PublicAuthShell'
import { useI18n } from '@/hooks/useI18n'
import { siteConfig } from '@/models/siteConfig'

export function DisableTwoFactorByEmailPage(): React.ReactElement {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()

  const { uid, token, valid } = useMemo(() => {
    const uidRaw = searchParams.get('uid')
    const tok = searchParams.get('token')
    const parsed = uidRaw ? Number.parseInt(uidRaw, 10) : NaN
    const ok = Number.isFinite(parsed) && Boolean(tok?.trim())
    return { uid: ok ? parsed : NaN, token: tok?.trim() ?? '', valid: ok }
  }, [searchParams])

  useDocumentTitle(`${siteConfig.name} · ${t('disable2faEmailPageTitle')}`)

  const disableQ = useQuery({
    queryKey: ['disableTwoFactorByEmail', uid, token],
    queryFn: () => getDisableTwoFactorByEmail(uid, token),
    enabled: valid,
    retry: false,
  })

  const err = disableQ.isError ? getBasicErrorFromUnknown(disableQ.error) : null

  if (!valid) {
    return (
      <PublicAuthCard stackGap="md">
        <Anchor component={Link} to="/account/login" size="sm">
          {t('signInAgain')}
        </Anchor>
        <Title order={2}>{t('disable2faEmailPageTitle')}</Title>
        <Alert color="red">{t('disable2faEmailInvalidParams')}</Alert>
      </PublicAuthCard>
    )
  }

  if (disableQ.isPending) {
    return (
      <PublicAuthCenter direction="row" gap="md">
        <Loader />
        <Text size="sm" c="dimmed">
          {t('disable2faEmailLoading')}
        </Text>
      </PublicAuthCenter>
    )
  }

  if (disableQ.isSuccess) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2}>{t('disable2faEmailPageTitle')}</Title>
        <Stack gap="xs" align="center">
          <Text fw={600} ta="center" c="teal">
            {t('disable2faEmailSuccessTitle')}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {t('disable2faEmailSuccessBody')}
          </Text>
          <Anchor component={Link} to="/account/login" size="sm">
            {t('signInAgain')}
          </Anchor>
        </Stack>
      </PublicAuthCard>
    )
  }

  return (
    <PublicAuthCard stackGap="md">
      <Anchor component={Link} to="/account/login" size="sm">
        {t('signInAgain')}
      </Anchor>
      <Title order={2}>{t('disable2faEmailPageTitle')}</Title>
      <Alert color="red" title={err?.msg ?? t('disable2faEmailFailed')}>
        {err?.detail}
      </Alert>
    </PublicAuthCard>
  )
}
