import { useQuery } from '@tanstack/react-query'
import { Alert, Anchor, Avatar, Card, SimpleGrid, Skeleton, Text, ThemeIcon } from '@mantine/core'
import { IconApps } from '@tabler/icons-react'

import classes from '@/components/apps/AppGrid.module.css'
import { fetchMyOAuthClients } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'

function ClientCard({
  name,
  description,
  icon,
  homeUrl,
}: {
  name: string
  description: string | null
  icon: string | null
  homeUrl: string
}): React.ReactElement {
  const hasIcon = Boolean(icon && icon.trim())

  return (
    <Card
      component="a"
      href={homeUrl}
      withBorder
      padding="md"
      radius="md"
      target="_self"
      classNames={{ root: classes.card }}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {hasIcon && icon ? (
        <Avatar
          src={icon}
          alt=""
          size={48}
          radius="md"
          mb="sm"
          className={classes.iconWrap}
        />
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
      <Text fw={600} lineClamp={2}>
        {name}
      </Text>
      {(description ?? '').trim() ? (
        <Text size="sm" c="dimmed" mt={6} lineClamp={2}>
          {description}
        </Text>
      ) : null}
    </Card>
  )
}

export function AppGrid(): React.ReactElement {
  const { t } = useI18n()
  const q = useQuery({
    queryKey: ['myOAuthClients'],
    queryFn: fetchMyOAuthClients,
  })

  const gridCols = { base: 2, sm: 4, md: 4 }

  if (q.isPending) {
    return (
      <SimpleGrid cols={gridCols} spacing="md">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={140} radius="md" />
        ))}
      </SimpleGrid>
    )
  }

  if (q.isError) {
    const basic: BasicError | null = getBasicErrorFromUnknown(q.error)
    return (
      <Alert color="red" title={basic?.msg ?? t('failedToLoadApps')}>
        {basic?.detail ? <Text size="sm">{basic.detail}</Text> : null}
        <Anchor component="button" type="button" onClick={() => q.refetch()} mt="sm">
          {t('retry')}
        </Anchor>
      </Alert>
    )
  }

  if (q.data.length === 0) {
    return (
      <Text c="dimmed" size="sm">
        {t('noAppsYet')}
      </Text>
    )
  }

  return (
    <SimpleGrid cols={gridCols} spacing="md">
      {q.data.map((c) => (
        <ClientCard
          key={c.id}
          name={c.name}
          description={c.description}
          icon={c.icon}
          homeUrl={c.home_url}
        />
      ))}
    </SimpleGrid>
  )
}
