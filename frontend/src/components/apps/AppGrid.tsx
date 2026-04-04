import { Alert, Anchor, Avatar, Card, SimpleGrid, Skeleton, Text, ThemeIcon } from '@mantine/core'
import { IconApps, IconLock } from '@tabler/icons-react'

import classes from '@/components/apps/AppGrid.module.css'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import type { OAuthClient } from '@/models/oauthClient'

function ClientCard({
  name,
  description,
  icon,
  homeUrl,
  restricted,
}: {
  name: string
  description: string | null
  icon: string | null
  homeUrl: string
  restricted?: boolean
}): React.ReactElement {
  const { t } = useI18n()
  const hasIcon = Boolean(icon && icon.trim())

  return (
    <Card
      component="a"
      href={homeUrl}
      withBorder
      padding="md"
      radius="md"
      target="_self"
      classNames={{
        root: `${classes.card}${restricted ? ` ${classes.cardRestricted}` : ''}`,
      }}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div className={classes.cardTop}>
        {hasIcon && icon ? (
          <Avatar
            src={icon}
            alt=""
            size={48}
            radius="md"
            mb="sm"
            className={classes.iconWrap}
          >
            <IconApps size={28} stroke={1.5} />
          </Avatar>
        ) : (
          <ThemeIcon
            size={48}
            radius="md"
            variant="light"
            mb="sm"
            className={classes.iconWrap}
          >
            <IconApps size={28} stroke={1.5} />
          </ThemeIcon>
        )}
        {restricted ? (
          <ThemeIcon
            className={classes.lockBadge}
            variant="light"
            color="gray"
            size="sm"
            radius="xl"
            aria-label={t('appAccessLimited')}
          >
            <IconLock size={14} stroke={1.5} />
          </ThemeIcon>
        ) : null}
      </div>
      <Text fw={600} lineClamp={2}>
        {name}
      </Text>
      {restricted ? (
        <Text size="xs" c="dimmed" mt={4}>
          {t('appAccessLimited')}
        </Text>
      ) : null}
      {(description ?? '').trim() ? (
        <Text size="sm" c="dimmed" mt={6} lineClamp={2}>
          {description}
        </Text>
      ) : null}
    </Card>
  )
}

const gridCols = { base: 2, sm: 4, md: 4 }

export function AppGrid({
  clients,
  isLoading,
  error,
  onRetry,
}: {
  clients?: OAuthClient[]
  isLoading: boolean
  error: unknown | null
  onRetry: () => void
}): React.ReactElement {
  const { t } = useI18n()

  if (isLoading) {
    return (
      <SimpleGrid cols={gridCols} spacing="md">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={140} radius="md" />
        ))}
      </SimpleGrid>
    )
  }

  if (error) {
    const basic: BasicError | null = getBasicErrorFromUnknown(error)
    return (
      <Alert color="red" title={basic?.msg ?? t('failedToLoadApps')}>
        {basic?.detail ? <Text size="sm">{basic.detail}</Text> : null}
        <Anchor component="button" type="button" onClick={onRetry} mt="sm">
          {t('retry')}
        </Anchor>
      </Alert>
    )
  }

  if (!clients?.length) {
    return (
      <Text c="dimmed" size="sm">
        {t('noAppsYet')}
      </Text>
    )
  }

  return (
    <SimpleGrid cols={gridCols} spacing="md">
      {clients.map((c) => (
        <ClientCard
          key={c.id}
          name={c.name}
          description={c.description}
          icon={c.icon}
          homeUrl={c.home_url}
          restricted={Boolean(c._is_ip_blocked)}
        />
      ))}
    </SimpleGrid>
  )
}
