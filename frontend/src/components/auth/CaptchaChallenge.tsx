import { ActionIcon, Group, Image, Loader, Stack, Text, TextInput, ThemeIcon } from '@mantine/core'
import { IconCheck, IconRefresh, IconX } from '@tabler/icons-react'
import { useCallback, useState } from 'react'

import { CaptchaRateLimitError, captchaImageUrl, createCaptchaChallenge } from '@/api/captcha'
import { useI18n } from '@/hooks/useI18n'

export type CaptchaChallengeProps = {
  challengeId: string | null
  imageKey: number
  answer: string
  validationError: string | null
  loadError: string | null
  answerValid?: boolean
  answerInvalid?: boolean
  checking?: boolean
  onChallengeIdChange: (id: string | null) => void
  onAnswerChange: (answer: string) => void
  onImageKeyChange: (key: number) => void
  onLoadErrorChange: (message: string | null) => void
  onLoadingChange?: (loading: boolean) => void
  onRateLimitedChange?: (rateLimited: boolean) => void
  disabled?: boolean
}

export function CaptchaChallenge({
  challengeId,
  imageKey,
  answer,
  validationError,
  loadError,
  answerValid = false,
  answerInvalid = false,
  checking = false,
  onChallengeIdChange,
  onAnswerChange,
  onImageKeyChange,
  onLoadErrorChange,
  onLoadingChange,
  onRateLimitedChange,
  disabled = false,
}: CaptchaChallengeProps): React.ReactElement {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    onLoadingChange?.(true)
    onLoadErrorChange(null)
    onRateLimitedChange?.(false)
    try {
      const id = await createCaptchaChallenge()
      onChallengeIdChange(id)
      onAnswerChange('')
      onImageKeyChange(imageKey + 1)
    } catch (err: unknown) {
      onChallengeIdChange(null)
      if (err instanceof CaptchaRateLimitError) {
        onLoadErrorChange(t('captchaRateLimited'))
        onRateLimitedChange?.(true)
      } else {
        onLoadErrorChange(t('captchaLoadError'))
      }
    } finally {
      setLoading(false)
      onLoadingChange?.(false)
    }
  }, [
    imageKey,
    onAnswerChange,
    onChallengeIdChange,
    onImageKeyChange,
    onLoadErrorChange,
    onLoadingChange,
    onRateLimitedChange,
    t,
  ])

  const imageSrc =
    challengeId !== null ? captchaImageUrl(challengeId, imageKey) : null

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {t('captchaLabel')}
      </Text>
      <Group align="center" gap="sm" wrap="nowrap">
        {imageSrc !== null ? (
          <Image
            src={imageSrc}
            alt={t('captchaImageAlt')}
            w={200}
            h={72}
            fit="contain"
            radius="sm"
            style={{ border: '1px solid var(--mantine-color-default-border)' }}
            onError={() => onLoadErrorChange(t('captchaLoadError'))}
          />
        ) : null}
        <ActionIcon
          variant="light"
          aria-label={t('captchaRefresh')}
          onClick={() => void refresh()}
          loading={loading}
          disabled={disabled}
        >
          <IconRefresh size={18} />
        </ActionIcon>
      </Group>
      {loadError !== null ? (
        <Text size="sm" c="red">
          {loadError}
        </Text>
      ) : null}
      <TextInput
        label={t('captchaAnswerLabel')}
        placeholder={t('captchaAnswerPlaceholder')}
        value={answer}
        onChange={(e) => {
          const digits = e.currentTarget.value.replace(/\D/g, '').slice(0, 4)
          onAnswerChange(digits)
        }}
        disabled={disabled || challengeId === null || loading}
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        error={validationError}
        rightSection={
          answerValid ? (
            <ThemeIcon color="green" variant="light" size="sm" radius="xl" aria-hidden>
              <IconCheck size={14} stroke={2.5} />
            </ThemeIcon>
          ) : answerInvalid ? (
            <ThemeIcon color="red" variant="light" size="sm" radius="xl" aria-hidden>
              <IconX size={14} stroke={2.5} />
            </ThemeIcon>
          ) : checking && answer.length === 4 ? (
            <Loader size="xs" aria-label={t('captchaChecking')} />
          ) : null
        }
        rightSectionPointerEvents="none"
        styles={
          answerValid
            ? { input: { borderColor: 'var(--mantine-color-green-6)' } }
            : answerInvalid
              ? { input: { borderColor: 'var(--mantine-color-red-6)' } }
              : undefined
        }
      />
    </Stack>
  )
}
