import { Badge, Container, rem, Stack, Text, Title } from '@mantine/core'

import { AppGrid } from '@/components/apps/AppGrid'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useI18n } from '@/hooks/useI18n'

function isAdmin(user: { groups?: { name: string }[] }): boolean {
  return user.groups?.some((g) => g.name === 'admin') ?? false
}

export function HomePage(): React.ReactElement {
  const { t } = useI18n()
  const user = useAuthUser()

  const displayName = user.nickname?.trim() || user.name

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Text size="lg">{t('welcomeUser', { name: displayName })}</Text>
          {isAdmin(user) ? (
            <Badge
              mt="xs"
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
        </div>
        <div>
          <Title order={3} mb="md">
            {t('myApps')}
          </Title>
          <AppGrid />
        </div>
      </Stack>
    </Container>
  )
}
