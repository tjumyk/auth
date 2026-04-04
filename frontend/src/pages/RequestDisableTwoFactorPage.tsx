import { useMutation } from '@tanstack/react-query'
import { Alert, Anchor, Button, Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { useState } from 'react'
import { Link } from 'react-router'

import { getRequestDisableTwoFactorByEmail } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { PublicAuthCard } from '@/components/layout/PublicAuthShell'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'

export function RequestDisableTwoFactorPage(): React.ReactElement {
  const { t } = useI18n()
  const [error, setError] = useState<BasicError | null>(null)

  useDocumentTitle(`${siteConfig.name} · ${t('requestDisable2faPageTitle')}`)

  const requestM = useMutation({
    mutationFn: getRequestDisableTwoFactorByEmail,
    onSuccess: () => {
      setError(null)
    },
    onError: (err) => {
      setError(getBasicErrorFromUnknown(err))
    },
  })

  return (
    <PublicAuthCard>
      <Anchor component={Link} to="/account/login" size="sm">
        {t('signInAgain')}
      </Anchor>
      <Title order={2}>{t('requestDisable2faHeading')}</Title>
      {error ? (
        <Alert color="red" title={error.msg} onClose={() => setError(null)} withCloseButton>
          {error.detail}
        </Alert>
      ) : null}
      {requestM.isSuccess ? (
        <Stack gap="xs" align="center">
          <Text fw={600} ta="center" c="teal">
            {t('requestDisable2faSuccessTitle')}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            {t('requestDisable2faSuccessBody')}
          </Text>
          <Anchor component={Link} to="/account/login" size="sm">
            {t('signInAgain')}
          </Anchor>
        </Stack>
      ) : (
        <Button loading={requestM.isPending} onClick={() => requestM.mutate()}>
          {t('requestDisable2faCta')}
        </Button>
      )}
    </PublicAuthCard>
  )
}
