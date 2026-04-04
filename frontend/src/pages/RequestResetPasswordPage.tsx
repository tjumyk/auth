import { useMutation } from '@tanstack/react-query'
import { Alert, Anchor, Button, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDocumentTitle } from '@mantine/hooks'
import { IconExternalLink } from '@tabler/icons-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { postRequestResetPassword } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { SiteLogoImage } from '@/components/branding/SiteLogoImage'
import { PublicAuthCard } from '@/components/layout/PublicAuthShell'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import type { ExternalAuthProvider } from '@/models/externalAuthProvider'
import { siteConfig } from '@/models/siteConfig'

export function RequestResetPasswordPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const [formError, setFormError] = useState<BasicError | null>(null)
  const [externalProvider, setExternalProvider] = useState<ExternalAuthProvider | null>(null)

  useDocumentTitle(`${siteConfig.name} · ${t('requestResetPasswordPageTitle')}`)

  const requestM = useMutation({
    mutationFn: postRequestResetPassword,
    onSuccess: (result) => {
      setFormError(null)
      if (result.kind === 'external_provider') {
        setExternalProvider(result.provider)
      }
    },
    onError: (err) => setFormError(getBasicErrorFromUnknown(err)),
  })

  const form = useForm({
    initialValues: { name_or_email: '' },
    validate: {
      name_or_email: (v) => (v.trim().length > 0 ? null : t('fieldRequired')),
    },
  })

  if (requestM.isSuccess && requestM.data?.kind === 'email_sent') {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2} c="teal">
          {t('requestResetPasswordSuccessTitle')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('requestResetPasswordSuccessBody')}
        </Text>
        <Anchor component={Link} to="/account/login" size="sm">
          {t('signInAgain')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  if (externalProvider) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2}>{t('requestResetPasswordExternalHeading')}</Title>
        {externalProvider.reset_password_url ? (
          <>
            <Text size="sm" c="dimmed">
              {t('requestResetPasswordExternalIntro', { name: externalProvider.name })}
            </Text>
            <Button
              component="a"
              href={externalProvider.reset_password_url}
              target="_blank"
              rel="noopener noreferrer"
              leftSection={<IconExternalLink size={18} />}
            >
              {t('requestResetPasswordExternalButton', { name: externalProvider.name })}
            </Button>
          </>
        ) : (
          <Text size="sm" c="dimmed">
            {t('requestResetPasswordExternalNoLink', { name: externalProvider.name })}
          </Text>
        )}
        <Anchor component={Link} to="/account/login" size="sm">
          {t('registerBackToSignIn')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  return (
    <PublicAuthCard>
      <Stack gap="md" align="center">
        <SiteLogoImage placement="login" />
        <Title order={2}>{t('requestResetPasswordHeading')}</Title>
      </Stack>
      {formError ? (
        <Alert
          color="red"
          title={formError.msg}
          onClose={() => setFormError(null)}
          withCloseButton
        >
          {formError.detail}
        </Alert>
      ) : null}
      <form
        onSubmit={form.onSubmit((values) => {
          setExternalProvider(null)
          requestM.mutate(values.name_or_email.trim())
        })}
      >
        <Stack gap="md" key={locale}>
          <TextInput
            label={t('usernameOrEmail')}
            required
            {...form.getInputProps('name_or_email')}
          />
          <Button type="submit" loading={requestM.isPending} fullWidth>
            {t('requestResetPasswordSubmit')}
          </Button>
        </Stack>
      </form>
      <Anchor component={Link} to="/account/login" size="sm">
        {t('registerBackToSignIn')}
      </Anchor>
    </PublicAuthCard>
  )
}
