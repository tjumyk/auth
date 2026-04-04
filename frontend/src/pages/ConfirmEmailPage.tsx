import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Anchor, Button, Loader, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDocumentTitle } from '@mantine/hooks'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import {
  fetchExternalAuthProvider,
  getConfirmEmailVerify,
  postConfirmEmailFinish,
} from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { PublicAuthCard, PublicAuthCenter } from '@/components/layout/PublicAuthShell'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'
import { validateNewPassword, validateRepeatNewPassword } from '@/utils/passwordValidation'

export function ConfirmEmailPage(): React.ReactElement | null {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [formError, setFormError] = useState<BasicError | null>(null)

  const { uid, token, valid } = useMemo(() => {
    const uidRaw = searchParams.get('uid')
    const tok = searchParams.get('token')
    const parsed = uidRaw ? Number.parseInt(uidRaw, 10) : Number.NaN
    const ok = Number.isFinite(parsed) && Boolean(tok?.trim())
    return { uid: ok ? parsed : 0, token: tok?.trim() ?? '', valid: ok }
  }, [searchParams])

  useDocumentTitle(`${siteConfig.name} · ${t('confirmEmailPageTitle')}`)

  const verifyQ = useQuery({
    queryKey: ['confirmEmailVerify', uid, token],
    queryFn: () => getConfirmEmailVerify(uid, token),
    enabled: valid,
    retry: false,
  })

  const verifyResult = verifyQ.data
  const user = verifyResult?.kind === 'user' ? verifyResult.user : undefined
  const alreadyConfirmed = verifyResult?.kind === 'already_confirmed'

  const providerQ = useQuery({
    queryKey: ['externalAuthProvider', user?.external_auth_provider_id],
    queryFn: () => fetchExternalAuthProvider(user!.external_auth_provider_id!),
    enabled: Boolean(user?.external_auth_provider_id),
    retry: false,
  })

  const finishM = useMutation({
    mutationFn: (new_password: string | null) => postConfirmEmailFinish(uid, token, new_password),
    onSuccess: () => {
      setFormError(null)
      void queryClient.invalidateQueries({ queryKey: ['whoami'] })
      void queryClient.invalidateQueries({ queryKey: ['accountMe'] })
      navigate('/', { replace: true })
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
        <Title order={2}>{t('confirmEmailPageTitle')}</Title>
        <Alert color="red">{t('confirmEmailInvalidParams')}</Alert>
        <Anchor component={Link} to="/account/request-reconfirm-email" size="sm">
          {t('loginFooterReconfirmEmail')}
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
          {t('confirmEmailVerifying')}
        </Text>
      </PublicAuthCenter>
    )
  }

  if (alreadyConfirmed) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2} c="teal">
          {t('confirmEmailAlreadyTitle')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('confirmEmailAlreadyBody')}
        </Text>
        <Button component={Link} to="/account/login">
          {t('signInAgain')}
        </Button>
      </PublicAuthCard>
    )
  }

  const verifyErr = verifyQ.isError ? getBasicErrorFromUnknown(verifyQ.error) : null

  if (verifyQ.isError && verifyErr) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2}>{t('confirmEmailPageTitle')}</Title>
        <Alert color="red" title={verifyErr.msg}>
          {verifyErr.detail}
        </Alert>
        <Anchor component={Link} to="/account/request-reconfirm-email" size="sm">
          {t('loginFooterReconfirmEmail')}
        </Anchor>
        <Anchor component={Link} to="/account/login" size="sm">
          {t('registerBackToSignIn')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  if (!user) {
    return null
  }

  const isExternal = Boolean(user.external_auth_provider_id)

  return (
    <PublicAuthCard>
      <Title order={2}>{t('confirmEmailPageTitle')}</Title>
      <Text size="sm" c="dimmed">
        {t('confirmEmailIntro')}
      </Text>
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
      <Stack gap="sm">
        <TextInput label={t('profileName')} value={user.name} readOnly disabled />
        <TextInput label={t('profileEmail')} value={user.email} readOnly disabled />
      </Stack>

      {isExternal ? (
        <Stack gap="md">
          {providerQ.isPending ? (
            <Loader size="sm" />
          ) : providerQ.data ? (
            <Text size="sm" c="dimmed">
              {t('confirmEmailExternalPasswordHint', { name: providerQ.data.name })}
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              {t('confirmEmailExternalPasswordGeneric')}
            </Text>
          )}
          <Button
            loading={finishM.isPending}
            onClick={() => {
              setFormError(null)
              finishM.mutate(null)
            }}
          >
            {t('confirmEmailFinish')}
          </Button>
        </Stack>
      ) : (
        <form
          onSubmit={form.onSubmit((values) => {
            setFormError(null)
            finishM.mutate(values.new_password)
          })}
        >
          <Stack gap="md" key={locale}>
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
            <Button type="submit" loading={finishM.isPending} fullWidth>
              {t('confirmEmailFinish')}
            </Button>
          </Stack>
        </form>
      )}

      <Text size="sm" c="dimmed" ta="center">
        <Anchor component={Link} to="/account/request-reconfirm-email" size="sm">
          {t('confirmEmailTokenHelp')}
        </Anchor>
      </Text>
    </PublicAuthCard>
  )
}
