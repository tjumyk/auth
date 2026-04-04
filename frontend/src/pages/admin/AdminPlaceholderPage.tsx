import { Container, Text, Title } from '@mantine/core'

import { useI18n } from '@/hooks/useI18n'

export function AdminPlaceholderPage({ titleKey }: { titleKey: string }): React.ReactElement {
  const { t } = useI18n()
  return (
    <Container size="lg" py="md">
      <Title order={2} mb="md">
        {t(titleKey)}
      </Title>
      <Text c="dimmed" size="sm">
        {t('adminWorkInProgress')}
      </Text>
    </Container>
  )
}
