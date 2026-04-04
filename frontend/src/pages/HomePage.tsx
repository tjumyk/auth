import { useQuery } from '@tanstack/react-query'
import {
  Anchor,
  Avatar,
  Badge,
  Button,
  Container,
  Group,
  Paper,
  rem,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { IconUser } from '@tabler/icons-react'
import { useMemo } from 'react'
import { Link } from 'react-router'

import { fetchIpCheck, fetchMyOAuthClients, IP_CHECK_QUERY_KEY } from '@/api/account'
import { AppGrid } from '@/components/apps/AppGrid'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useI18n } from '@/hooks/useI18n'
import {
  enrichOAuthClientsWithIpCheck,
  findGateClient,
} from '@/utils/enrichOAuthClientsWithIpCheck'

function isAdmin(user: { groups?: { name: string }[] }): boolean {
  return user.groups?.some((g) => g.name === 'admin') ?? false
}

export function HomePage(): React.ReactElement {
  const { t } = useI18n()
  const user = useAuthUser()

  const clientsQ = useQuery({
    queryKey: ['myOAuthClients'],
    queryFn: fetchMyOAuthClients,
  })

  const ipQ = useQuery({
    queryKey: IP_CHECK_QUERY_KEY,
    queryFn: fetchIpCheck,
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

  const displayName = user.nickname?.trim() || user.name
  const showAdmin2faWarning = isAdmin(user) && !user.is_two_factor_enabled

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
              <Badge
                variant="light"
                color="violet"
                styles={{
                  root: {
                    height: 'auto',
                    minHeight: 'var(--badge-height)',
                    paddingBlock: rem(4),
                    lineHeight: 1.45,
                    overflow: 'visible',
                  },
                  label: {
                    lineHeight: 1.45,
                    overflow: 'visible',
                    textBoxTrim: 'none',
                    textBoxEdge: 'text',
                  },
                }}
              >
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
                  <Anchor href={gateClient.home_url} underline="hover" style={{ textDecoration: 'none' }}>
                    <Group gap="xs" wrap="nowrap">
                      {gateClient.icon ? (
                        <Avatar src={gateClient.icon} alt="" size={28} radius="sm" />
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
          />
        </div>
      </Stack>
    </Container>
  )
}
