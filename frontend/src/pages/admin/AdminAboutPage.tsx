import { useQuery } from '@tanstack/react-query'
import { Alert, Code, Container, Loader, Stack, Text, Title } from '@mantine/core'

import { getBasicErrorFromUnknown } from '@/api/client'
import { fetchMetaVersion } from '@/api/meta'
import { useI18n } from '@/hooks/useI18n'

const META_VERSION_QK = ['meta', 'version'] as const

export function AdminAboutPage(): React.ReactElement {
  const { t } = useI18n()
  const q = useQuery({ queryKey: META_VERSION_QK, queryFn: fetchMetaVersion })

  return (
    <Container size="sm" py="md">
      <Title order={2} mb="lg">
        {t('adminTitleAbout')}
      </Title>

      {q.isPending && (
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      )}

      {q.isError && (
        <Alert color="red">
          {getBasicErrorFromUnknown(q.error)?.msg ?? t('adminAboutLoadFailed')}
        </Alert>
      )}

      {q.isSuccess && (
        <Stack gap="xs">
          <Text fw={600}>{t('adminAboutVersionTitle')}</Text>
          <Text size="sm" c="dimmed">
            {t('adminAboutCommitLabel')}
          </Text>
          <Code block>{q.data.commit}</Code>
        </Stack>
      )}
    </Container>
  )
}
