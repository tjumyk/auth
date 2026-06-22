import { useMutation, useQuery } from '@tanstack/react-query'
import { Alert, Anchor, Button, Loader, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDocumentTitle } from '@mantine/hooks'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'

import { getResetPasswordVerify, postResetPasswordCommit } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { PublicAuthCard, PublicAuthCenter } from '@/components/layout/PublicAuthShell'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'
import { validateNewPassword, validateRepeatNewPassword } from '@/utils/passwordValidation'
import { formatPasswordServiceError } from '@/utils/passwordErrorMessage'

export function ResetPasswordPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const [searchParams] = useSearchParams()
  const [formError, setFormError] = useState<BasicError | null>(null)

  const { uid, token, valid } = useMemo(() => {
    const uidRaw = searchParams.get('uid')
    const tok = searchParams.get('token')
    const parsed = uidRaw ? Number.parseInt(uidRaw, 10) : Number.NaN
    const ok = Number.isFinite(parsed) && Boolean(tok?.trim())
    return { uid: ok ? parsed : 0, token: tok?.trim() ?? '', valid: ok }
  }, [searchParams])

  useDocumentTitle(`${siteConfig.name} · ${t('resetPasswordPageTitle')}`)

  const verifyQ = useQuery({
    queryKey: ['resetPasswordVerify', uid, token],
    queryFn: () => getResetPasswordVerify(uid, token),
    enabled: valid,
    retry: false,
  })

  const resetM = useMutation({
    mutationFn: (new_password: string) => postResetPasswordCommit(uid, token, new_password),
    onSuccess: () => {
      setFormError(null)
    },
    onError: (err) => {
      setFormError(getBasicErrorFromUnknown(err))
    },
  })

  const form = useForm({
    initialValues: { new_password: '', repeat_new_password: '' },
    validate: {
      new_password: (v) => validateNewPassword(v, t),
      repeat_new_password: (v, values) => validateRepeatNewPassword(v, values.new_password, t),
    },
  })

  if (!valid) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2}>{t('resetPasswordPageTitle')}</Title>
        <Alert color="red">{t('resetPasswordInvalidParams')}</Alert>
        <Anchor component={Link} to="/account/request-reset-password" size="sm">
          {t('resetPasswordRequestNewLink')}
        </Anchor>
        <Anchor component={Link} to="/account/login" size="sm">
          {t('registerBackToSignIn')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  if (verifyQ.isPending) {
    return (
      <PublicAuthCenter direction="column" gap="md">
        <Loader />
        <Text size="sm" c="dimmed" ta="center">
          {t('resetPasswordVerifying')}
        </Text>
      </PublicAuthCenter>
    )
  }

  const verifyErr = verifyQ.isError ? getBasicErrorFromUnknown(verifyQ.error) : null

  if (verifyQ.isError && verifyErr) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2}>{t('resetPasswordPageTitle')}</Title>
        <Alert color="red" title={verifyErr.msg}>
          {verifyErr.detail}
        </Alert>
        <Anchor component={Link} to="/account/request-reset-password" size="sm">
          {t('resetPasswordRequestNewLink')}
        </Anchor>
        <Anchor component={Link} to="/account/login" size="sm">
          {t('registerBackToSignIn')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  const user = verifyQ.data

  if (resetM.isSuccess) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2} c="teal">
          {t('resetPasswordSuccessTitle')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('resetPasswordSuccessBody')}
        </Text>
        <Anchor component={Link} to="/account/login" size="sm">
          {t('signInAgain')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  return (
    <PublicAuthCard>
      <Title order={2}>{t('resetPasswordPageTitle')}</Title>
      <Text size="sm" c="dimmed">
        {t('resetPasswordIntro', { name: user?.name ?? '' })}
      </Text>
      {formError ? (
        <Alert
          color="red"
          title={formatPasswordServiceError(formError, t)?.title ?? formError.msg}
          onClose={() => setFormError(null)}
          withCloseButton
        >
          {formatPasswordServiceError(formError, t)?.detail ?? formError.detail}
        </Alert>
      ) : null}
      <form
        onSubmit={form.onSubmit((values) => {
          resetM.mutate(values.new_password)
        })}
      >
        <Stack gap="md" key={locale}>
          <TextInput label={t('profileName')} value={user?.name ?? ''} readOnly disabled />
          <TextInput
            label={t('newPassword')}
            type="password"
            required
            autoComplete="new-password"
            {...form.getInputProps('new_password')}
          />
          <Text size="xs" c="dimmed">
            {t('passwordLengthHint')} {t('passwordComplexityHint')}
          </Text>
          <TextInput
            label={t('confirmNewPassword')}
            type="password"
            required
            autoComplete="new-password"
            {...form.getInputProps('repeat_new_password')}
          />
          <Button type="submit" loading={resetM.isPending} fullWidth>
            {t('resetPasswordSubmit')}
          </Button>
        </Stack>
      </form>
      <Text size="sm" c="dimmed" ta="center">
        <Anchor component={Link} to="/account/request-reset-password" size="sm">
          {t('resetPasswordRequestNewLink')}
        </Anchor>
      </Text>
    </PublicAuthCard>
  )
}
