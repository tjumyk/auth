import { useMutation } from '@tanstack/react-query'
import { Alert, Anchor, Button, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDocumentTitle } from '@mantine/hooks'
import { useState } from 'react'
import { Link } from 'react-router'

import { postRequestReconfirmEmail } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { SiteLogoImage } from '@/components/branding/SiteLogoImage'
import { PublicAuthCard } from '@/components/layout/PublicAuthShell'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'

export function RequestReconfirmEmailPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const [formError, setFormError] = useState<BasicError | null>(null)

  useDocumentTitle(`${siteConfig.name} · ${t('requestReconfirmPageTitle')}`)

  const requestM = useMutation({
    mutationFn: (name_or_email: string) => postRequestReconfirmEmail(name_or_email),
    onSuccess: () => setFormError(null),
    onError: (err) => setFormError(getBasicErrorFromUnknown(err)),
  })

  const form = useForm({
    initialValues: { name_or_email: '' },
    validate: {
      name_or_email: (v) => (v.trim().length > 0 ? null : t('fieldRequired')),
    },
  })

  if (requestM.isSuccess) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2} c="teal">
          {t('requestReconfirmSuccessTitle')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('requestReconfirmSuccessBody')}
        </Text>
        <Anchor component={Link} to="/account/login" size="sm">
          {t('signInAgain')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  return (
    <PublicAuthCard>
      <Stack gap="md" align="center">
        <SiteLogoImage placement="login" />
        <Title order={2}>{t('requestReconfirmHeading')}</Title>
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
            {t('requestReconfirmSubmit')}
          </Button>
        </Stack>
      </form>
      <Anchor component={Link} to="/account/login" size="sm">
        {t('registerBackToSignIn')}
      </Anchor>
    </PublicAuthCard>
  )
}
