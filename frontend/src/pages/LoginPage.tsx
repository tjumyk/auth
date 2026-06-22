import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Anchor, Loader, Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { fetchWhoami, PasswordExpiredWhoamiError, postLogin, postTwoFactorLogin } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { LoginFooterLinks } from '@/components/auth/LoginFooterLinks'
import { LoginForm, type LoginFormValues } from '@/components/auth/LoginForm'
import { TwoFactorPanel } from '@/components/auth/TwoFactorPanel'
import { SiteBrandBlock } from '@/components/branding/SiteBrandBlock'
import { PublicAuthCard, PublicAuthCenter } from '@/components/layout/PublicAuthShell'
import { useRedirectAfterLogin } from '@/hooks/useRedirectAfterLogin'
import { useSafeRedirectPath } from '@/hooks/useSafeRedirectPath'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'
import { isPasswordExpiredError } from '@/utils/passwordErrorMessage'

export function LoginPage(): React.ReactElement {
  const { t, locale } = useI18n()
  useDocumentTitle(`${siteConfig.name} · ${t('signInPageTitle')}`)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = useSafeRedirectPath()
  const [step, setStep] = useState<'password' | '2fa'>('password')
  const [rememberFor2fa, setRememberFor2fa] = useState(false)
  const [formError, setFormError] = useState<BasicError | null>(null)
  const [loginGuardRefresh, setLoginGuardRefresh] = useState(0)

  const whoamiQ = useQuery({
    queryKey: ['whoami'],
    queryFn: fetchWhoami,
    staleTime: 0,
  })

  const showSessionExpired =
    searchParams.get('password_expired') === '1' ||
    (whoamiQ.isError && whoamiQ.error instanceof PasswordExpiredWhoamiError)

  useRedirectAfterLogin(whoamiQ.data ?? undefined)

  const loginM = useMutation({
    mutationFn: (v: LoginFormValues) =>
      postLogin(
        v.name_or_email.trim(),
        v.password,
        v.remember,
        v.captcha_challenge_id && v.captcha_answer
          ? { challenge_id: v.captcha_challenge_id, answer: v.captcha_answer }
          : undefined,
      ),
    onSuccess: (user, variables) => {
      setFormError(null)
      if (user.is_two_factor_enabled) {
        setRememberFor2fa(variables.remember)
        setStep('2fa')
        return
      }
      queryClient.setQueryData(['whoami'], user)
      void queryClient.invalidateQueries({ queryKey: ['myOAuthClients'] })
      navigate(redirect, { replace: true })
    },
    onError: (err) => {
      const basic = getBasicErrorFromUnknown(err)
      setFormError(basic)
      setLoginGuardRefresh((n) => n + 1)
    },
  })

  const twoFaM = useMutation({
    mutationFn: (token: string) => postTwoFactorLogin(token, rememberFor2fa),
    onSuccess: (user) => {
      setFormError(null)
      queryClient.setQueryData(['whoami'], user)
      void queryClient.invalidateQueries({ queryKey: ['myOAuthClients'] })
      navigate(redirect, { replace: true })
    },
    onError: (err) => {
      setFormError(getBasicErrorFromUnknown(err))
    },
  })

  if (whoamiQ.isPending) {
    return (
      <PublicAuthCenter direction="column" gap="xl">
        <SiteBrandBlock />
        <Loader />
        <Text size="sm" c="dimmed" ta="center">
          {t('checkingUserStatus')}
        </Text>
      </PublicAuthCenter>
    )
  }

  return (
    <PublicAuthCard scrollable>
      <SiteBrandBlock />
      <Title order={2}>{t('signInHeading')}</Title>
      {showSessionExpired ? (
        <Alert color="red" title={t('passwordExpiryLoginExpiredTitle')}>
          <Stack gap="xs">
            <Text size="sm">{t('passwordExpiryLoginExpiredBody')}</Text>
            <Anchor component={Link} to="/account/request-reset-password" size="sm">
              {t('loginFooterResetPassword')}
            </Anchor>
          </Stack>
        </Alert>
      ) : null}
      {formError ? (
        <Alert
          color="red"
          title={
            isPasswordExpiredError(formError)
              ? t('passwordExpiryLoginExpiredTitle')
              : formError.msg
          }
          onClose={() => setFormError(null)}
          withCloseButton
        >
          {isPasswordExpiredError(formError) ? (
            <Stack gap="xs">
              <Text size="sm">{t('passwordExpiryLoginExpiredBody')}</Text>
              <Anchor component={Link} to="/account/request-reset-password" size="sm">
                {t('loginFooterResetPassword')}
              </Anchor>
            </Stack>
          ) : (
            formError.detail
          )}
        </Alert>
      ) : null}
      {step === 'password' ? (
        <LoginForm
          key={locale}
          loading={loginM.isPending}
          loginGuardRefresh={loginGuardRefresh}
          onSubmit={(v) => {
            loginM.mutate(v)
          }}
        />
      ) : (
        <TwoFactorPanel
          loading={twoFaM.isPending}
          onBack={() => {
            setStep('password')
            setFormError(null)
          }}
          onSubmit={(token) => twoFaM.mutate(token)}
        />
      )}
      {step === 'password' ? <LoginFooterLinks /> : null}
    </PublicAuthCard>
  )
}
