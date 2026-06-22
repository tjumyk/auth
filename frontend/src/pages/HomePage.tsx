import { useQuery } from '@tanstack/react-query'
import {
  Anchor,
  Avatar,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconSettings, IconUser } from '@tabler/icons-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'

import { fetchIpCheck, fetchMyOAuthClients, IP_CHECK_QUERY_KEY } from '@/api/account'
import { fetchMetaTime, META_TIME_QUERY_KEY } from '@/api/meta'
import { AppGrid } from '@/components/apps/AppGrid'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useI18n } from '@/hooks/useI18n'
import {
  enrichOAuthClientsWithIpCheck,
  findGateClient,
} from '@/utils/enrichOAuthClientsWithIpCheck'
import { formatClockSkewSeconds, isClockSkewWarning } from '@/utils/clockSkew'
import { isAdmin } from '@/utils/isAdmin'
import { shouldWarnAdminInsecureHttp } from '@/utils/isHttpHostedPage'
import { formatPasswordExpiryDate, shouldInterceptPasswordExpiry } from '@/utils/passwordExpiry'
import { siteAssetSrc } from '@/utils/siteAssetUrl'
import { getUserDisplayName } from '@/utils/userDisplayName'

export function HomePage(): React.ReactElement {
  const { t, locale } = useI18n()
  const user = useAuthUser()
  const navigate = useNavigate()

  const clientsQ = useQuery({
    queryKey: ['myOAuthClients'],
    queryFn: fetchMyOAuthClients,
  })

  const ipQ = useQuery({
    queryKey: IP_CHECK_QUERY_KEY,
    queryFn: fetchIpCheck,
    staleTime: 60_000,
  })

  const timeQ = useQuery({
    queryKey: META_TIME_QUERY_KEY,
    queryFn: fetchMetaTime,
    staleTime: 60_000,
  })

  const enrichedClients = useMemo(() => {
    if (!clientsQ.data) {
      return undefined
    }
    return enrichOAuthClientsWithIpCheck(
      clientsQ.data,
      ipQ.isSuccess ? (ipQ.data ?? null) : null,
    )
  }, [clientsQ.data, ipQ.isSuccess, ipQ.data])

  const hasIpBlocked = useMemo(
    () => enrichedClients?.some((c) => c._is_ip_blocked) ?? false,
    [enrichedClients],
  )

  const gateClient = useMemo(
    () => (enrichedClients ? findGateClient(enrichedClients) : undefined),
    [enrichedClients],
  )

  const displayName = getUserDisplayName(user)
  const showAdmin2faWarning = isAdmin(user) && !user.is_two_factor_enabled
  const showAdminInsecureHttpWarning = isAdmin(user) && shouldWarnAdminInsecureHttp()
  const showClockSkewWarning = timeQ.isSuccess && isClockSkewWarning(timeQ.data.skewSeconds)
  const clockSkewSeconds =
    timeQ.isSuccess ? formatClockSkewSeconds(timeQ.data.skewSeconds) : 0
  const passwordExpiryDate = formatPasswordExpiryDate(user.password_expires_at, locale)
  const showPasswordExpiry1Month = user.password_expiry_status === 'warning_1month'
  const showPasswordExpiry1Week = user.password_expiry_status === 'warning_1week'
  const interceptApps = shouldInterceptPasswordExpiry(user)

  const handleClientNavigate = (homeUrl: string, clientId: number): void => {
    if (interceptApps) {
      navigate(`/account/password-expiry?intent_client_id=${clientId}`)
      return
    }
    window.location.href = homeUrl
  }

  const refetchApps = (): void => {
    void clientsQ.refetch()
    void ipQ.refetch()
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
          <Group gap="xs" wrap="nowrap" align="center">
            <Text size="lg">{t('welcomeUser', { name: displayName })}</Text>
            {isAdmin(user) ? (
              <Badge variant="light" color="violet">
                {t('administrator')}
              </Badge>
            ) : null}
          </Group>
          <Group gap="xs" wrap="nowrap" justify="flex-end" style={{ flexShrink: 0 }}>
            <Button
              component={Link}
              to="/account/profile"
              variant="light"
              color="gray"
              size="sm"
              leftSection={<IconUser size={18} stroke={1.5} />}
            >
              {t('profileNav')}
            </Button>
            {isAdmin(user) ? (
              <Button
                component={Link}
                to="/admin"
                variant="light"
                color="violet"
                size="sm"
                leftSection={<IconSettings size={18} stroke={1.5} />}
              >
                {t('management')}
              </Button>
            ) : null}
          </Group>
        </Group>

        {showAdmin2faWarning ? (
          <Paper
            shadow="xs"
            p="md"
            radius="md"
            withBorder
            style={{
              background: 'light-dark(var(--mantine-color-yellow-0), rgba(250, 176, 5, 0.12))',
              borderColor: 'light-dark(var(--mantine-color-yellow-3), var(--mantine-color-dark-4))',
            }}
          >
            <Stack gap="sm">
              <Text fw={600} size="sm">
                {t('admin2faHeroTitle')}
              </Text>
              <Text size="sm" c="dimmed">
                {t('admin2faHeroBody')}
              </Text>
              <div>
                <Button component={Link} to="/account/two-factor" size="xs" variant="filled">
                  {t('admin2faHeroCta')}
                </Button>
              </div>
            </Stack>
          </Paper>
        ) : null}

        {showClockSkewWarning ? (
          <Paper
            shadow="xs"
            p="md"
            radius="md"
            withBorder
            style={{
              background: 'light-dark(var(--mantine-color-yellow-0), rgba(250, 176, 5, 0.12))',
              borderColor: 'light-dark(var(--mantine-color-yellow-3), var(--mantine-color-dark-4))',
            }}
          >
            <Stack gap="sm">
              <Text fw={600} size="sm">
                {t('clockSkewHeroTitle')}
              </Text>
              <Text size="sm" c="dimmed">
                {t('clockSkewHeroBody', { seconds: clockSkewSeconds })}
              </Text>
            </Stack>
          </Paper>
        ) : null}

        {showPasswordExpiry1Month ? (
          <Paper
            shadow="xs"
            p="md"
            radius="md"
            withBorder
            style={{
              background: 'light-dark(var(--mantine-color-yellow-0), rgba(250, 176, 5, 0.12))',
              borderColor: 'light-dark(var(--mantine-color-yellow-3), var(--mantine-color-dark-4))',
            }}
          >
            <Stack gap="sm">
              <Text fw={600} size="sm">
                {t('passwordExpiry1MonthHeroTitle')}
              </Text>
              <Text size="sm" c="dimmed">
                {t('passwordExpiry1MonthHeroBody', { date: passwordExpiryDate })}
              </Text>
              <Group gap="xs">
                <Button component={Link} to="/account/profile" size="xs" variant="filled">
                  {t('passwordExpiryResetCta')}
                </Button>
                <Button component={Link} to="/account/two-factor" size="xs" variant="light">
                  {t('passwordExpiry2faCta')}
                </Button>
              </Group>
            </Stack>
          </Paper>
        ) : null}

        {showPasswordExpiry1Week ? (
          <Paper
            shadow="xs"
            p="md"
            radius="md"
            withBorder
            style={{
              background: 'light-dark(var(--mantine-color-yellow-0), rgba(250, 176, 5, 0.12))',
              borderColor: 'light-dark(var(--mantine-color-yellow-3), var(--mantine-color-dark-4))',
            }}
          >
            <Stack gap="sm">
              <Text fw={600} size="sm">
                {t('passwordExpiry1WeekHeroTitle')}
              </Text>
              <Text size="sm" c="dimmed">
                {t('passwordExpiry1WeekHeroBody', { date: passwordExpiryDate })}
              </Text>
              <Group gap="xs">
                <Button component={Link} to="/account/profile" size="xs" variant="filled">
                  {t('passwordExpiryResetCta')}
                </Button>
                <Button component={Link} to="/account/two-factor" size="xs" variant="light">
                  {t('passwordExpiry2faCta')}
                </Button>
              </Group>
            </Stack>
          </Paper>
        ) : null}

        {showAdminInsecureHttpWarning ? (
          <Paper
            shadow="xs"
            p="md"
            radius="md"
            withBorder
            style={{
              background: 'light-dark(var(--mantine-color-red-0), rgba(250, 82, 82, 0.12))',
              borderColor: 'light-dark(var(--mantine-color-red-3), var(--mantine-color-dark-4))',
            }}
          >
            <Stack gap="sm">
              <Text fw={600} size="sm">
                {t('adminInsecureHttpHeroTitle')}
              </Text>
              <Text size="sm" c="dimmed">
                {t('adminInsecureHttpHeroBody')}
              </Text>
            </Stack>
          </Paper>
        ) : null}

        {hasIpBlocked ? (
          <Paper
            shadow="xs"
            p="md"
            radius="md"
            withBorder
            style={{
              background: 'light-dark(var(--mantine-color-blue-0), rgba(34, 139, 230, 0.12))',
              borderColor: 'light-dark(var(--mantine-color-blue-3), var(--mantine-color-dark-4))',
            }}
          >
            <Stack gap="sm">
              <Text fw={600} size="sm">
                {t('ipUntrustedHeroTitle')}
              </Text>
              <Text size="sm" c="dimmed">
                {t('ipUntrustedHeroBody')}
              </Text>
              {gateClient ? (
                <Group gap="xs" wrap="nowrap" align="center">
                  <Anchor
                    component="button"
                    type="button"
                    underline="hover"
                    style={{ textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    onClick={() => handleClientNavigate(gateClient.home_url, gateClient.id)}
                  >
                    <Group gap="xs" wrap="nowrap">
                      {gateClient.icon ? (
                        <Avatar
                          src={siteAssetSrc(gateClient.icon) ?? undefined}
                          alt=""
                          size={28}
                          radius="sm"
                        />
                      ) : null}
                      <Text size="sm" fw={500}>
                        {t('ipUntrustedGateCta', { name: gateClient.name })}
                      </Text>
                    </Group>
                  </Anchor>
                </Group>
              ) : null}
            </Stack>
          </Paper>
        ) : null}

        <div>
          <Title order={3} mb="md">
            {t('myApps')}
          </Title>
          <AppGrid
            clients={enrichedClients}
            isLoading={clientsQ.isPending}
            error={clientsQ.error}
            onRetry={refetchApps}
            onClientNavigate={handleClientNavigate}
          />
        </div>
      </Stack>
    </Container>
  )
}
