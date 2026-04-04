import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  alpha,
  Alert,
  Flex,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
  rem,
  useComputedColorScheme,
  useMantineTheme,
} from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import { type CSSProperties, useMemo, useState } from 'react'

import { fetchWhoami, postLogin, postTwoFactorLogin } from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { LoginForm, type LoginFormValues } from '@/components/auth/LoginForm'
import { TwoFactorPanel } from '@/components/auth/TwoFactorPanel'
import { SiteLogoImage } from '@/components/branding/SiteLogoImage'
import { ThemeLocaleToolbar } from '@/components/layout/ThemeLocaleToolbar'
import { useRedirectAfterLogin } from '@/hooks/useRedirectAfterLogin'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'

function useLoginBackdropStyle(): CSSProperties {
  const theme = useMantineTheme()
  const colorScheme = useComputedColorScheme('light')

  return useMemo(() => {
    const { brand } = theme.colors
    if (colorScheme === 'dark') {
      return {
        minHeight: '100dvh',
        backgroundColor: theme.colors.dark[8],
        backgroundImage: `
          radial-gradient(ellipse 110% 75% at 100% -5%, ${alpha(brand[4], 0.32)} 0%, transparent 52%),
          radial-gradient(ellipse 90% 60% at -5% 105%, ${alpha(brand[8], 0.22)} 0%, transparent 48%),
          linear-gradient(168deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 45%, ${theme.colors.dark[9]} 100%)
        `,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }
    }
    return {
      minHeight: '100dvh',
      backgroundColor: theme.colors.gray[0],
      backgroundImage: `
        radial-gradient(ellipse 105% 70% at 92% -8%, ${alpha(brand[2], 0.55)} 0%, transparent 50%),
        radial-gradient(ellipse 85% 55% at -8% 102%, ${alpha(brand[1], 0.45)} 0%, transparent 46%),
        linear-gradient(168deg, ${theme.colors.gray[0]} 0%, ${alpha(brand[0], 0.9)} 38%, ${theme.colors.gray[1]} 100%)
      `,
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
    }
  }, [colorScheme, theme])
}

export function LoginPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const shellStyle = useLoginBackdropStyle()
  useDocumentTitle(`${siteConfig.name} · ${t('signInPageTitle')}`)
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'password' | '2fa'>('password')
  const [rememberFor2fa, setRememberFor2fa] = useState(false)
  const [formError, setFormError] = useState<BasicError | null>(null)

  const whoamiQ = useQuery({
    queryKey: ['whoami'],
    queryFn: fetchWhoami,
    staleTime: 0,
  })

  useRedirectAfterLogin(whoamiQ.data ?? undefined)

  const loginM = useMutation({
    mutationFn: (v: LoginFormValues) =>
      postLogin(v.name_or_email.trim(), v.password, v.remember),
    onSuccess: (user, variables) => {
      setFormError(null)
      if (user.is_two_factor_enabled) {
        setRememberFor2fa(variables.remember)
        setStep('2fa')
        return
      }
      queryClient.setQueryData(['whoami'], user)
      void queryClient.invalidateQueries({ queryKey: ['myOAuthClients'] })
    },
    onError: (err) => {
      setFormError(getBasicErrorFromUnknown(err))
    },
  })

  const twoFaM = useMutation({
    mutationFn: (token: string) => postTwoFactorLogin(token, rememberFor2fa),
    onSuccess: (user) => {
      setFormError(null)
      queryClient.setQueryData(['whoami'], user)
      void queryClient.invalidateQueries({ queryKey: ['myOAuthClients'] })
    },
    onError: (err) => {
      setFormError(getBasicErrorFromUnknown(err))
    },
  })

  const toolbar = (
    <Group justify="flex-end" px="md" pt="md" pb={0} wrap="nowrap" style={{ flexShrink: 0 }}>
      <ThemeLocaleToolbar />
    </Group>
  )

  const brandBlock = (
    <Stack gap="md" align="center">
      <SiteLogoImage placement="login" />
      <Stack gap={4} align="center">
        <Title order={3} ta="center" lh={1.25}>
          {siteConfig.name}
        </Title>
        {siteConfig.organizationName.trim() ? (
          <Text size="sm" c="dimmed" ta="center" lh={1.35}>
            {siteConfig.organizationName}
          </Text>
        ) : null}
        {siteConfig.groupName.trim() ? (
          <Text size="xs" c="dimmed" ta="center" lh={1.35}>
            {siteConfig.groupName}
          </Text>
        ) : null}
      </Stack>
    </Stack>
  )

  if (whoamiQ.isPending) {
    return (
      <Flex direction="column" component="main" style={shellStyle}>
        {toolbar}
        <Flex
          flex={1}
          align="center"
          justify="center"
          direction="column"
          gap="xl"
          p="md"
          style={{ minHeight: 0 }}
        >
          {brandBlock}
          <Loader />
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex direction="column" component="main" style={shellStyle}>
      {toolbar}
      <Flex
        flex={1}
        align="center"
        justify="center"
        p="md"
        style={{ minHeight: 0, overflow: 'auto' }}
      >
        <Paper
          shadow="xs"
          p="xl"
          radius="md"
          withBorder
          w="100%"
          maw={rem(400)}
          mx="auto"
        >
          <Stack gap="lg">
            {brandBlock}
            <Title order={2}>{t('signInHeading')}</Title>
            {formError ? (
              <Alert
                color="red"
                title={formError.msg}
                onClose={() => setFormError(null)}
                withCloseButton
              >
                {formError.detail}
              </Alert>
            ) : null}
            {step === 'password' ? (
              <LoginForm
                key={locale}
                loading={loginM.isPending}
                onSubmit={(v) => {
                  loginM.mutate(v)
                }}
              />
            ) : (
              <TwoFactorPanel
                loading={twoFaM.isPending}
                onBack={() => {
                  setStep('password')
                  setFormError(null)
                }}
                onSubmit={(token) => twoFaM.mutate(token)}
              />
            )}
          </Stack>
        </Paper>
      </Flex>
    </Flex>
  )
}
