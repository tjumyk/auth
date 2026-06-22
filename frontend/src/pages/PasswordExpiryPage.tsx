import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Stack, Text, Title } from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { fetchMyOAuthClients, postPasswordExpirySkip } from '@/api/account'
import { getOAuthConnect } from '@/api/oauth'
import { getBasicErrorFromUnknown } from '@/api/client'
import { PublicAuthCard } from '@/components/layout/PublicAuthShell'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'
import { formatPasswordExpiryDate } from '@/utils/passwordExpiry'

function buildOAuthSearchParams(searchParams: URLSearchParams): string {
  const parts: string[] = []
  const clientId = searchParams.get('client_id')
  const redirectUrl = searchParams.get('redirect_url')
  if (clientId) parts.push(`client_id=${encodeURIComponent(clientId)}`)
  if (redirectUrl) parts.push(`redirect_url=${encodeURIComponent(redirectUrl)}`)
  const originalPath = searchParams.get('original_path')
  if (originalPath) parts.push(`original_path=${encodeURIComponent(originalPath)}`)
  const state = searchParams.get('state')
  if (state) parts.push(`state=${encodeURIComponent(state)}`)
  const intentClientId = searchParams.get('intent_client_id')
  if (intentClientId) parts.push(`intent_client_id=${encodeURIComponent(intentClientId)}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

async function resumeAfterSkip(
  queryClient: ReturnType<typeof useQueryClient>,
  oauthParams: {
    client_id: number
    redirect_url: string
    original_path: string | null
    state: string | null
  } | null,
  intentClientId: number | null,
): Promise<string | null> {
  if (oauthParams) {
    const result = await getOAuthConnect(
      oauthParams.client_id,
      oauthParams.redirect_url,
      oauthParams.original_path,
      oauthParams.state,
    )
    return result.redirect_url ?? null
  }
  if (intentClientId != null) {
    const clients = await queryClient.fetchQuery({
      queryKey: ['myOAuthClients'],
      queryFn: fetchMyOAuthClients,
    })
    const client = clients.find((c) => c.id === intentClientId)
    return client?.home_url ?? null
  }
  return null
}

export function PasswordExpiryPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const user = useAuthUser()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [actionError, setActionError] = useState<BasicError | null>(null)

  useDocumentTitle(`${siteConfig.name} · ${t('passwordExpiryPageTitle')}`)

  const expiryLabel = useMemo(
    () => formatPasswordExpiryDate(user?.password_expires_at, locale),
    [user?.password_expires_at, locale],
  )

  const oauthParams = useMemo(() => {
    const rawId = searchParams.get('client_id')
    const redirect_url = searchParams.get('redirect_url')
    const id = rawId != null ? Number.parseInt(rawId, 10) : Number.NaN
    if (!Number.isFinite(id) || redirect_url == null || redirect_url.length === 0) {
      return null
    }
    return {
      client_id: id,
      redirect_url,
      original_path: searchParams.get('original_path'),
      state: searchParams.get('state'),
    }
  }, [searchParams])

  const intentClientId = useMemo(() => {
    const raw = searchParams.get('intent_client_id')
    if (raw == null) {
      return null
    }
    const id = Number.parseInt(raw, 10)
    return Number.isFinite(id) ? id : null
  }, [searchParams])

  const skipM = useMutation({
    mutationFn: postPasswordExpirySkip,
    onSuccess: async (updatedUser) => {
      setActionError(null)
      queryClient.setQueryData(['whoami'], updatedUser)
      try {
        const redirectUrl = await resumeAfterSkip(queryClient, oauthParams, intentClientId)
        if (redirectUrl) {
          window.location.href = redirectUrl
          return
        }
      } catch (err) {
        setActionError(
          getBasicErrorFromUnknown(err) ?? {
            msg: t('oauthConnectFailedTitle'),
            detail: t('oauthConnectFailedDetail'),
          },
        )
        return
      }
      navigate('/')
    },
    onError: (err) => {
      setActionError(getBasicErrorFromUnknown(err))
    },
  })

  return (
    <PublicAuthCard stackGap="md">
      <Title order={2}>{t('passwordExpiryPageTitle')}</Title>
      <Text size="sm" c="dimmed">
        {t('passwordExpiryPageBody', { date: expiryLabel })}
      </Text>
      {actionError ? (
        <Alert
          color="red"
          title={actionError.msg}
          onClose={() => setActionError(null)}
          withCloseButton
        >
          {actionError.detail}
        </Alert>
      ) : null}
      <Stack gap="xs">
        <Button component={Link} to="/account/profile" variant="filled">
          {t('passwordExpiryResetCta')}
        </Button>
        <Button component={Link} to="/account/two-factor" variant="light">
          {t('passwordExpiry2faCta')}
        </Button>
        <Button
          variant="subtle"
          color="gray"
          loading={skipM.isPending}
          onClick={() => skipM.mutate()}
        >
          {t('passwordExpirySkipCta')}
        </Button>
      </Stack>
    </PublicAuthCard>
  )
}

export function buildPasswordExpiryPath(searchParams: URLSearchParams): string {
  return `/account/password-expiry${buildOAuthSearchParams(searchParams)}`
}
