import { Button, Group, Stack, Text, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'

import { useI18n } from '@/hooks/useI18n'

export function ConfirmEmailUrlField({
  url,
  hint,
}: {
  url: string
  hint?: string
}): React.ReactElement {
  const { t } = useI18n()

  const copyUrl = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url)
      notifications.show({ color: 'teal', message: t('copyToClipboardSuccess') })
    } catch {
      notifications.show({ color: 'red', message: t('copyToClipboardFailed') })
    }
  }

  return (
    <Stack gap="xs">
      {hint ? (
        <Text size="sm" c="dimmed">
          {hint}
        </Text>
      ) : null}
      <TextInput
        value={url}
        readOnly
        styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)' } }}
        onFocus={(e) => e.currentTarget.select()}
      />
      <Group>
        <Button variant="light" size="sm" onClick={() => void copyUrl()}>
          {t('adminUserCopyConfirmUrl')}
        </Button>
      </Group>
    </Stack>
  )
}
