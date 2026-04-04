import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  alpha,
  Anchor,
  Avatar,
  Box,
  Button,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  rem,
  useMantineTheme,
} from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { IconApps } from '@tabler/icons-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { SiteBrandBlock } from '@/components/branding/SiteBrandBlock'
import { fetchWhoami, postLogin, postTwoFactorLogin } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { fetchOAuthClient, getOAuthConnect } from '@/api/oauth'
import { LoginFooterLinks } from '@/components/auth/LoginFooterLinks'
import { LoginForm, type LoginFormValues } from '@/components/auth/LoginForm'
import { TwoFactorPanel } from '@/components/auth/TwoFactorPanel'
import { SiteLogoImage } from '@/components/branding/SiteLogoImage'
import { PublicAuthCard, PublicAuthCenter } from '@/components/layout/PublicAuthShell'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'
import type { User } from '@/models/user'

/** Compact cue that this flow is handled by the central identity service (not the OAuth client). */
function OAuthIdentityPill(): React.ReactElement {
  const { t } = useI18n()
  const theme = useMantineTheme()
  const line = theme.colors.gray[6]
  return (
    <Box mx="auto" w="100%" maw={rem(340)}>
      <Group
        justify="center"
        wrap="nowrap"
        gap="xs"
        px="sm"
        py={6}
        mx="auto"
        w="fit-content"
        maw="100%"
        style={{
          borderRadius: rem(9999),
          border: `1px solid ${alpha(line, 0.22)}`,
          backgroundColor: alpha(line, 0.06),
        }}
      >
        <SiteLogoImage placement="header" />
        <Text component="span" size="xs" c="dimmed" lh={1.35} style={{ textAlign: 'center' }}>
          {t('oauthIdentityProviderHint', { name: siteConfig.name })}
        </Text>
      </Group>
    </Box>
  )
}

function oauthParams(
  searchParams: URLSearchParams,
): { ok: true; params: OAuthQueryParams } | { ok: false } {
  const rawId = searchParams.get('client_id')
  const redirect_url = searchParams.get('redirect_url')
  const id = rawId != null ? Number.parseInt(rawId, 10) : Number.NaN
  if (!Number.isFinite(id) || redirect_url == null || redirect_url.length === 0) {
    return { ok: false }
  }
  return {
    ok: true,
    params: {
      client_id: id,
      redirect_url,
      original_path: searchParams.get('original_path'),
      state: searchParams.get('state'),
    },
  }
}

type OAuthQueryParams = {
  client_id: number
  redirect_url: string
  original_path: string | null
  state: string | null
}

export function OAuthLoginPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const parsed = useMemo(() => oauthParams(searchParams), [searchParams])
  const [step, setStep] = useState<'password' | '2fa'>('password')
  const [rememberFor2fa, setRememberFor2fa] = useState(false)
  const [formError, setFormError] = useState<BasicError | null>(null)
  const [connectError, setConnectError] = useState<BasicError | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const connectAttemptedRef = useRef(false)

  useDocumentTitle(`${siteConfig.name} · ${t('oauthSignInPageTitle')}`)

  const whoamiQ = useQuery({
    queryKey: ['whoami'],
    queryFn: fetchWhoami,
    staleTime: 0,
    enabled: parsed.ok,
  })

  const clientQ = useQuery({
    queryKey: ['oauthClient', parsed.ok ? parsed.params.client_id : null],
    queryFn: () => fetchOAuthClient(parsed.ok ? parsed.params.client_id : 0),
    enabled: parsed.ok && whoamiQ.data === null && !whoamiQ.isPending,
  })

  useEffect(() => {
    if (clientQ.data?.name) {
      document.title = `${clientQ.data.name} · ${t('oauthSignInPageTitle')}`
    }
  }, [clientQ.data?.name, t])

  const connectM = useMutation({
    mutationFn: (p: OAuthQueryParams) =>
      getOAuthConnect(p.client_id, p.redirect_url, p.original_path, p.state),
    onSuccess: (result) => {
      setConnectError(null)
      if (result.redirect_url) {
        setRedirecting(true)
        window.location.href = result.redirect_url
        return
      }
      setConnectError({
        msg: t('oauthNoRedirectTitle'),
        detail: t('oauthNoRedirectDetail'),
      })
    },
    onError: (err) => {
      setConnectError(
        getBasicErrorFromUnknown(err) ?? {
          msg: t('oauthConnectFailedTitle'),
          detail: t('oauthConnectFailedDetail'),
        },
      )
    },
  })

  useEffect(() => {
    if (!parsed.ok || !whoamiQ.data) {
      return
    }
    if (connectAttemptedRef.current || connectM.isPending || redirecting) {
      return
    }
    connectAttemptedRef.current = true
    connectM.mutate(parsed.params)
  }, [parsed, whoamiQ.data, connectM, redirecting])

  const loginM = useMutation({
    mutationFn: (v: LoginFormValues) =>
      postLogin(v.name_or_email.trim(), v.password, v.remember),
    onSuccess: (user: User, variables) => {
      setFormError(null)
      if (user.is_two_factor_enabled) {
        setRememberFor2fa(variables.remember)
        setStep('2fa')
        return
      }
      queryClient.setQueryData(['whoami'], user)
      void queryClient.invalidateQueries({ queryKey: ['myOAuthClients'] })
    },
    onError: (err) => {
      setFormError(getBasicErrorFromUnknown(err))
    },
  })

  const twoFaM = useMutation({
    mutationFn: (token: string) => postTwoFactorLogin(token, rememberFor2fa),
    onSuccess: (user) => {
      setFormError(null)
      queryClient.setQueryData(['whoami'], user)
      void queryClient.invalidateQueries({ queryKey: ['myOAuthClients'] })
    },
    onError: (err) => {
      setFormError(getBasicErrorFromUnknown(err))
    },
  })

  if (!parsed.ok) {
    return (
      <PublicAuthCard stackGap="md">
        <Title order={2}>{t('oauthSignInPageTitle')}</Title>
        <Alert color="red" title={t('wrongUrlParametersTitle')}>
          {t('wrongUrlParametersDetail')}
        </Alert>
        <Anchor component={Link} to="/account/login" size="sm">
          {t('signInAgain')}
        </Anchor>
      </PublicAuthCard>
    )
  }

  const { params } = parsed

  if (whoamiQ.isPending) {
    return (
      <PublicAuthCenter direction="column" gap="md">
        <SiteBrandBlock />
        <Loader />
        <Text size="sm" c="dimmed" ta="center">
          {t('checkingUserStatus')}
        </Text>
      </PublicAuthCenter>
    )
  }

  const user = whoamiQ.data
  if (user) {
    const authorizing =
      connectM.isPending ||
      redirecting ||
      (connectM.isSuccess && connectError === null) ||
      (connectM.isIdle && !connectM.isError && connectError === null)

    if (authorizing) {
      return (
        <PublicAuthCenter direction="column" gap="md">
          <SiteBrandBlock />
          <Loader />
          <Text size="sm" c="dimmed" ta="center">
            {redirecting
              ? t('oauthRedirectingToClient', {
                  name: clientQ.data?.name ?? t('oauthClientFallbackName'),
                })
              : t('oauthStartingAuthorization')}
          </Text>
        </PublicAuthCenter>
      )
    }

    if (connectError) {
      return (
        <PublicAuthCard stackGap="md">
          <SiteBrandBlock />
          <Title order={2}>{t('oauthSignInPageTitle')}</Title>
          <Alert color="red" title={connectError.msg}>
            {connectError.detail}
          </Alert>
          <Button
            onClick={() => {
              setConnectError(null)
              connectM.reset()
              connectAttemptedRef.current = true
              connectM.mutate(params)
            }}
            loading={connectM.isPending}
          >
            {t('retry')}
          </Button>
          <Anchor component={Link} to="/account/login" size="sm">
            {t('signInAgain')}
          </Anchor>
        </PublicAuthCard>
      )
    }
  }

  return (
    <PublicAuthCard scrollable>
      <OAuthIdentityPill />

      {clientQ.isPending ? (
        <Stack align="center" gap="sm" py="lg">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            {t('oauthLoadingClientInfo')}
          </Text>
        </Stack>
      ) : clientQ.data ? (
        <Stack gap="md" align="center">
          <Avatar
            src={clientQ.data.icon?.trim() ? clientQ.data.icon : null}
            alt={clientQ.data.name}
            name={clientQ.data.name}
            size={64}
            radius="md"
            variant="light"
            color="gray"
            imageProps={{ style: { objectFit: 'contain' } }}
          >
            <IconApps size={28} stroke={1.5} aria-hidden />
          </Avatar>
          <Stack gap={4} align="center">
            <Title order={3} ta="center" lh={1.25}>
              {clientQ.data.name}
            </Title>
            {clientQ.data.description ? (
              <Text size="sm" c="dimmed" ta="center" lh={1.35}>
                {clientQ.data.description}
              </Text>
            ) : null}
          </Stack>
        </Stack>
      ) : null}

      <Title order={3} size="h4" ta="center" mt="xs">
        {t('oauthSignInHeading')}
      </Title>
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
      {step === 'password' ? (
        <LoginForm
          key={locale}
          loading={loginM.isPending}
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
