import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Anchor, Button, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDocumentTitle } from '@mantine/hooks'
import { useState } from 'react'
import { Link } from 'react-router'

import { fetchWhoami, postRegister } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { SiteLogoImage } from '@/components/branding/SiteLogoImage'
import { PublicAuthCard, PublicAuthCenter } from '@/components/layout/PublicAuthShell'
import { useRedirectAfterLogin } from '@/hooks/useRedirectAfterLogin'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { mailEnabled } from '@/models/mailConfig'
import { siteConfig } from '@/models/siteConfig'
import { EMAIL_MAX_LENGTH, isValidEmail } from '@/utils/emailValidation'

const USERNAME_PATTERN = /^\w{3,16}$/

export function RegisterPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const [formError, setFormError] = useState<BasicError | null>(null)

  useDocumentTitle(`${siteConfig.name} · ${t('registerPageTitle')}`)

  const whoamiQ = useQuery({
    queryKey: ['whoami'],
    queryFn: fetchWhoami,
    staleTime: 0,
  })

  useRedirectAfterLogin(whoamiQ.data ?? undefined)

  const registerM = useMutation({
    mutationFn: ({ name, email }: { name: string; email: string }) => postRegister(name, email),
    onSuccess: () => {
      setFormError(null)
    },
    onError: (err) => {
      setFormError(getBasicErrorFromUnknown(err))
    },
  })

  const form = useForm({
    initialValues: { name: '', email: '' },
    validate: {
      name: (v) => {
        const s = v.trim()
        if (s.length === 0) return t('registerNameRequired')
        if (s.length < 3) return t('registerNameMin')
        if (s.length > 16) return t('registerNameMax')
        if (!USERNAME_PATTERN.test(s)) return t('registerNamePattern')
        return null
      },
      email: (v) => {
        const s = v.trim()
        if (s.length === 0) return t('registerEmailRequired')
        if (s.length > EMAIL_MAX_LENGTH) return t('registerEmailMax')
        if (!isValidEmail(s)) return t('registerEmailInvalid')
        return null
      },
    },
  })

  if (whoamiQ.isPending) {
    return (
      <PublicAuthCenter direction="column" gap="md">
        <SiteLogoImage placement="login" />
        <Text size="sm" c="dimmed">
          {t('checkingUserStatus')}
        </Text>
      </PublicAuthCenter>
    )
  }

  if (!mailEnabled) {
    return (
      <PublicAuthCard stackGap="md">
        <SiteLogoImage placement="login" />
        <Alert color="yellow" title={t('registerUnavailableTitle')}>
          <Text size="sm">{t('registerUnavailableBody')}</Text>
        </Alert>
        <Anchor component={Link} to="/account/login" size="sm">
          {t('registerBackToSignIn')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  if (registerM.isSuccess) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2} c="teal">
          {t('registerSuccessTitle')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('registerSuccessBody')}
        </Text>
        <Anchor component={Link} to="/account/login" size="sm">
          {t('signInAgain')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  return (
    <PublicAuthCard scrollable>
      <Stack gap="md" align="center">
        <SiteLogoImage placement="login" />
        <Title order={2}>{t('registerHeading')}</Title>
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
          registerM.mutate({
            name: values.name.trim(),
            email: values.email.trim(),
          })
        })}
      >
        <Stack gap="md" key={locale}>
          <TextInput
            label={t('registerUsernameLabel')}
            placeholder={t('registerUsernamePlaceholder')}
            required
            {...form.getInputProps('name')}
          />
          <TextInput
            label={t('registerEmailLabel')}
            placeholder={t('registerEmailPlaceholder')}
            required
            type="email"
            {...form.getInputProps('email')}
          />
          <Button type="submit" loading={registerM.isPending} fullWidth color="teal">
            {t('registerSubmit')}
          </Button>
        </Stack>
      </form>
      <Anchor component={Link} to="/account/login" size="sm" ta="center">
        {t('registerBackToSignIn')}
      </Anchor>
    </PublicAuthCard>
  )
}
