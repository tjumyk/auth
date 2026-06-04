import { Button, Checkbox, PasswordInput, Stack, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDebouncedValue } from '@mantine/hooks'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  CaptchaRateLimitError,
  checkCaptchaAnswer,
  createCaptchaChallenge,
  fetchLoginGuard,
} from '@/api/captcha'
import { CaptchaChallenge } from '@/components/auth/CaptchaChallenge'
import { useI18n } from '@/hooks/useI18n'

export type LoginFormValues = {
  name_or_email: string
  password: string
  remember: boolean
  captcha_challenge_id: string | null
  captcha_answer: string
}

export function LoginForm({
  onSubmit,
  loading,
  loginGuardRefresh = 0,
}: {
  onSubmit: (values: LoginFormValues) => void
  loading: boolean
  /** Increment after a failed login to re-fetch captcha requirement. */
  loginGuardRefresh?: number
}): React.ReactElement {
  const { t } = useI18n()
  const [captchaRequired, setCaptchaRequired] = useState(false)
  const [captchaChallengeId, setCaptchaChallengeId] = useState<string | null>(null)
  const [captchaImageKey, setCaptchaImageKey] = useState(0)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaPassed, setCaptchaPassed] = useState<boolean | null>(null)
  const [captchaChecking, setCaptchaChecking] = useState(false)
  const [captchaLoading, setCaptchaLoading] = useState(false)
  const [captchaRateLimited, setCaptchaRateLimited] = useState(false)
  const [captchaLoadError, setCaptchaLoadError] = useState<string | null>(null)
  const challengeLoadStarted = useRef(false)

  const form = useForm<LoginFormValues>({
    initialValues: {
      name_or_email: '',
      password: '',
      remember: false,
      captcha_challenge_id: null,
      captcha_answer: '',
    },
    validate: {
      name_or_email: (v) => (v.trim().length > 0 ? null : t('fieldRequired')),
      password: (v) => (v.length > 0 ? null : t('fieldRequired')),
    },
  })

  const [debouncedName] = useDebouncedValue(form.values.name_or_email.trim(), 400)

  const loadChallenge = useCallback(async () => {
    if (captchaLoading || captchaRateLimited) {
      return
    }
    setCaptchaLoading(true)
    setCaptchaLoadError(null)
    setCaptchaPassed(null)
    try {
      const id = await createCaptchaChallenge()
      setCaptchaChallengeId(id)
      setCaptchaAnswer('')
      setCaptchaImageKey((k) => k + 1)
    } catch (err: unknown) {
      setCaptchaChallengeId(null)
      setCaptchaAnswer('')
      if (err instanceof CaptchaRateLimitError) {
        setCaptchaRateLimited(true)
        setCaptchaLoadError(t('captchaRateLimited'))
      } else {
        setCaptchaLoadError(t('captchaLoadError'))
      }
    } finally {
      setCaptchaLoading(false)
    }
  }, [captchaLoading, captchaRateLimited, t])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const required = await fetchLoginGuard(debouncedName || undefined)
        if (cancelled) {
          return
        }
        setCaptchaRequired(required)
        if (!required) {
          setCaptchaChallengeId(null)
          setCaptchaAnswer('')
          setCaptchaPassed(null)
          setCaptchaLoadError(null)
          setCaptchaRateLimited(false)
          challengeLoadStarted.current = false
        } else {
          challengeLoadStarted.current = false
        }
      } catch {
        if (!cancelled) {
          setCaptchaRequired(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [debouncedName, loginGuardRefresh])

  useEffect(() => {
    if (loginGuardRefresh === 0) {
      return
    }
    setCaptchaChallengeId(null)
    setCaptchaAnswer('')
    setCaptchaPassed(null)
    setCaptchaLoadError(null)
    setCaptchaRateLimited(false)
    challengeLoadStarted.current = false
  }, [loginGuardRefresh])

  useEffect(() => {
    if (!captchaRequired) {
      return
    }
    if (challengeLoadStarted.current || captchaChallengeId !== null || captchaRateLimited) {
      return
    }
    challengeLoadStarted.current = true
    void loadChallenge()
  }, [captchaRequired, captchaChallengeId, captchaRateLimited, loadChallenge])

  useEffect(() => {
    if (!captchaRequired || captchaAnswer.length !== 4 || !captchaChallengeId) {
      setCaptchaPassed(null)
      return
    }

    let cancelled = false
    setCaptchaChecking(true)
    void (async () => {
      try {
        const valid = await checkCaptchaAnswer(captchaChallengeId, captchaAnswer)
        if (!cancelled) {
          setCaptchaPassed(valid)
        }
      } catch {
        if (!cancelled) {
          setCaptchaPassed(false)
        }
      } finally {
        if (!cancelled) {
          setCaptchaChecking(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [captchaRequired, captchaAnswer, captchaChallengeId])

  const nameOk = form.values.name_or_email.trim().length > 0
  const passwordOk = form.values.password.length > 0
  const captchaOk =
    !captchaRequired ||
    (captchaChallengeId !== null &&
      captchaAnswer.length === 4 &&
      captchaPassed === true &&
      !captchaChecking &&
      !captchaLoading &&
      !captchaRateLimited)

  const canSubmit = nameOk && passwordOk && captchaOk && !loading

  const captchaValidationError =
    captchaRequired && captchaAnswer.length === 4 && captchaPassed === false && !captchaChecking
      ? t('captchaAnswerWrong')
      : null

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        if (!canSubmit) {
          return
        }
        onSubmit({
          ...values,
          captcha_challenge_id: captchaRequired ? captchaChallengeId : null,
          captcha_answer: captchaRequired ? captchaAnswer : '',
        })
      })}
    >
      <Stack gap="md">
        <TextInput label={t('usernameOrEmail')} required {...form.getInputProps('name_or_email')} />
        <PasswordInput label={t('password')} required {...form.getInputProps('password')} />
        {captchaRequired ? (
          <CaptchaChallenge
              challengeId={captchaChallengeId}
              imageKey={captchaImageKey}
              answer={captchaAnswer}
              loadError={captchaLoadError}
              validationError={captchaValidationError}
              onLoadErrorChange={setCaptchaLoadError}
              answerValid={captchaPassed === true && !captchaChecking}
              answerInvalid={
                captchaPassed === false && captchaAnswer.length === 4 && !captchaChecking
              }
              checking={captchaChecking}
              onChallengeIdChange={(id) => {
                setCaptchaChallengeId(id)
                setCaptchaPassed(null)
                if (id === null) {
                  challengeLoadStarted.current = false
                }
              }}
              onAnswerChange={(a) => {
                setCaptchaAnswer(a)
                setCaptchaPassed(null)
              }}
              onImageKeyChange={setCaptchaImageKey}
              onLoadingChange={setCaptchaLoading}
              onRateLimitedChange={(limited) => {
                setCaptchaRateLimited(limited)
                if (limited) {
                  challengeLoadStarted.current = true
                }
              }}
              disabled={loading}
            />
        ) : null}
        <Checkbox label={t('rememberMe')} {...form.getInputProps('remember', { type: 'checkbox' })} />
        <Button type="submit" loading={loading} disabled={!canSubmit} fullWidth>
          {t('signInSubmit')}
        </Button>
      </Stack>
    </form>
  )
}
