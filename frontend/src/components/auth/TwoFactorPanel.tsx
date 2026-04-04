import { Button, Group, PinInput, Stack, Text } from '@mantine/core'
import { useState } from 'react'

import { useI18n } from '@/hooks/useI18n'

const TOTP_LENGTH = 6

export function TwoFactorPanel({
  onSubmit,
  onBack,
  loading,
}: {
  onSubmit: (token: string) => void
  onBack: () => void
  loading: boolean
}): React.ReactElement {
  const { t } = useI18n()
  const [token, setToken] = useState('')

  const complete = token.length === TOTP_LENGTH

  const submit = (value: string) => {
    const v = value.trim()
    if (v.length === TOTP_LENGTH) {
      onSubmit(v)
    }
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        {t('twoFactorHint')}
      </Text>
      <Stack gap="xs" w="100%" align="stretch">
        <Text size="sm" fw={500} ta="center">
          {t('authCode')}
        </Text>
        <PinInput
          length={TOTP_LENGTH}
          type="number"
          value={token}
          onChange={setToken}
          onComplete={(value) => submit(value)}
          oneTimeCode
          size="md"
          gap="sm"
          w="100%"
          disabled={loading}
          autoFocus
          ariaLabel={t('authCode')}
          inputMode="numeric"
          inputType="tel"
          styles={{
            root: { width: '100%', justifyContent: 'center' },
            pinInput: {
              flex: '1 1 0',
              minWidth: 0,
              width: '100%',
              maxWidth: 'none',
            },
            input: { width: '100%' },
          }}
        />
      </Stack>
      <Group justify="space-between" wrap="nowrap">
        <Button variant="subtle" onClick={onBack} disabled={loading}>
          {t('back')}
        </Button>
        <Button
          loading={loading}
          disabled={!complete}
          onClick={() => submit(token)}
        >
          {t('verify')}
        </Button>
      </Group>
    </Stack>
  )
}
