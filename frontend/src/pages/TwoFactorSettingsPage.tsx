import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Anchor,
  Box,
  Button,
  Container,
  Group,
  Image,
  Loader,
  Paper,
  PinInput,
  Stack,
  Stepper,
  Text,
  Title,
} from '@mantine/core'
import { useDocumentTitle } from '@mantine/hooks'
import {
  IconArrowLeft,
  IconBrandApple,
  IconBrandGooglePlay,
  IconShield,
} from '@tabler/icons-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import {
  ACCOUNT_ME_QUERY_KEY,
  fetchAccountMe,
  fetchTwoFactorSetup,
  postTwoFactorConfirmSetup,
  postTwoFactorDisable,
} from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { AccountMeUser } from '@/models/user'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'

const QR_EXPIRE_MS = 55 * 1000
const TOTP_LENGTH = 6

const GOOGLE_PLAY_AUTHENTICATOR =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'
const APP_STORE_AUTHENTICATOR = 'https://apps.apple.com/us/app/google-authenticator/id388497605?mt=8'

const GOOGLE_PLAY_MS_AUTHENTICATOR =
  'https://play.google.com/store/apps/details?id=com.azure.authenticator'
const APP_STORE_MS_AUTHENTICATOR =
  'https://apps.apple.com/app/microsoft-authenticator/id983156458'

const totpStoreLinkButtonStyles = {
  root: { height: 'auto', paddingBlock: 'var(--mantine-spacing-xs)' },
  label: { whiteSpace: 'normal' as const, textAlign: 'left' as const },
  inner: { alignItems: 'center' as const },
}

function TotpStoreLinkButton({
  href,
  icon,
  primaryLabel,
  secondaryLabel,
}: {
  href: string
  icon: ReactNode
  primaryLabel: string
  secondaryLabel: string
}): React.ReactElement {
  return (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      size="sm"
      variant="light"
      leftSection={icon}
      styles={totpStoreLinkButtonStyles}
    >
      <Stack gap={2} align="flex-start" justify="center" miw={0}>
        <Text size="sm" fw={600} lh={1.25}>
          {primaryLabel}
        </Text>
        <Text size="xs" c="dimmed" lh={1.25}>
          {secondaryLabel}
        </Text>
      </Stack>
    </Button>
  )
}

function TotpPinFieldBlock({
  label,
  value,
  onChange,
  pinDisabled,
  children,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  pinDisabled: boolean
  children: ReactNode
}): React.ReactElement {
  return (
    <Stack gap="md" maw={280} mx="auto" w="100%">
      <Stack gap="xs" align="center" >
        <Text size="sm" fw={500} ta="center">
          {label}
        </Text>
        <PinInput
          length={TOTP_LENGTH}
          type="number"
          value={value}
          onChange={onChange}
          oneTimeCode
          size="sm"
          gap={6}
          disabled={pinDisabled}
          ariaLabel={label}
          inputMode="numeric"
          inputType="tel"
          styles={{
            root: { justifyContent: 'center', width: 'auto' },
          }}
        />
      </Stack>
      <Group justify="center" w="100%" px='md'>
        {children}
      </Group>
    </Stack>
  )
}

function patchAccountMe2fa(
  queryClient: ReturnType<typeof useQueryClient>,
  enabled: boolean,
): void {
  queryClient.setQueryData<AccountMeUser | undefined>(ACCOUNT_ME_QUERY_KEY, (old) =>
    old ? { ...old, is_two_factor_enabled: enabled } : old,
  )
  void queryClient.invalidateQueries({ queryKey: ['whoami'] })
}

export function TwoFactorSettingsPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const queryClient = useQueryClient()
  const [pageError, setPageError] = useState<BasicError | null>(null)
  const [setupQr, setSetupQr] = useState<string | null>(null)
  const [setupExpired, setSetupExpired] = useState(false)
  const [confirmToken, setConfirmToken] = useState('')
  const [showDisableForm, setShowDisableForm] = useState(false)
  const [disableToken, setDisableToken] = useState('')

  useDocumentTitle(`${siteConfig.name} · ${t('twoFactorSettingsTitle')}`)

  const meQ = useQuery({
    queryKey: ACCOUNT_ME_QUERY_KEY,
    queryFn: fetchAccountMe,
  })

  useEffect(() => {
    if (!setupQr) {
      return
    }
    const id = window.setTimeout(() => setSetupExpired(true), QR_EXPIRE_MS)
    return () => window.clearTimeout(id)
  }, [setupQr])

  const clearError = useCallback(() => setPageError(null), [])

  const setupM = useMutation({
    mutationFn: () => fetchTwoFactorSetup(),
    onMutate: () => {
      clearError()
    },
    onSuccess: (data) => {
      setSetupQr(data.qr_code)
      setConfirmToken('')
      setSetupExpired(false)
    },
    onError: (err) => {
      setPageError(getBasicErrorFromUnknown(err))
    },
  })

  const confirmM = useMutation({
    mutationFn: (token: string) => postTwoFactorConfirmSetup(token),
    onMutate: () => {
      clearError()
    },
    onSuccess: () => {
      setSetupQr(null)
      setConfirmToken('')
      setSetupExpired(false)
      setShowDisableForm(false)
      patchAccountMe2fa(queryClient, true)
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_ME_QUERY_KEY })
    },
    onError: (err) => {
      setPageError(getBasicErrorFromUnknown(err))
    },
  })

  const disableM = useMutation({
    mutationFn: (token: string) => postTwoFactorDisable(token),
    onMutate: () => {
      clearError()
    },
    onSuccess: () => {
      setDisableToken('')
      setShowDisableForm(false)
      patchAccountMe2fa(queryClient, false)
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_ME_QUERY_KEY })
    },
    onError: (err) => {
      setPageError(getBasicErrorFromUnknown(err))
    },
  })

  const user = meQ.data
  const confirmComplete = confirmToken.length === TOTP_LENGTH
  const disableComplete = disableToken.length === TOTP_LENGTH

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <Button
            component={Link}
            to="/account/profile"
            variant="subtle"
            size="compact-sm"
            mb="xs"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('backToProfile')}
          </Button>
          <Group gap="sm">
            <IconShield size={28} stroke={1.5} />
            <Title order={2}>{t('twoFactorSettingsTitle')}</Title>
          </Group>
        </div>

        {pageError ? (
          <Alert
            color="red"
            title={pageError.msg}
            onClose={() => setPageError(null)}
            withCloseButton
          >
            {pageError.detail}
          </Alert>
        ) : null}

        {meQ.isPending ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : null}

        {meQ.isError ? (
          <Alert color="red" title={t('profileLoadFailed')}>
            <Anchor component="button" type="button" onClick={() => void meQ.refetch()}>
              {t('retry')}
            </Anchor>
          </Alert>
        ) : null}

        {user ? (
          <Paper p="md" radius="md" withBorder shadow="xs">
            {user.is_two_factor_enabled ? (
              <Stack gap="md">
                <Text c="teal" fw={500}>
                  {t('twoFactorEnabledMessage')}
                </Text>
                {!showDisableForm ? (
                  <Button color="red" variant="light" onClick={() => setShowDisableForm(true)}>
                    {t('twoFactorDisableCta')}
                  </Button>
                ) : (
                  <Stack gap="md" key={`disable-${locale}`}>
                    <TotpPinFieldBlock
                      label={t('twoFactorTokenLabel')}
                      value={disableToken}
                      onChange={setDisableToken}
                      pinDisabled={disableM.isPending}
                    >
                      <Button
                        color="red"
                        size="sm"
                        loading={disableM.isPending}
                        disabled={!disableComplete || disableM.isPending}
                        onClick={() => disableM.mutate(disableToken)}
                        w="100%"
                      >
                        {t('twoFactorVerifyDisable')}
                      </Button>
                    </TotpPinFieldBlock>
                    <Stack gap={4}>
                      <Text size="sm" c="dimmed">
                        {t('twoFactorLostAuthenticatorHint')}
                      </Text>
                      <Anchor component={Link} to="/account/request-disable-two-factor-by-email" size="sm">
                        {t('twoFactorRequestEmailDisable')}
                      </Anchor>
                    </Stack>
                  </Stack>
                )}
              </Stack>
            ) : (
              <Stack gap="md">
                <Title order={4}>{t('twoFactorHowToTitle')}</Title>
                <Stepper
                  active={setupQr ? 1 : 0}
                  orientation="vertical"
                  allowNextStepsSelect={false}
                >
                  <Stepper.Step 
                    label={t('twoFactorStepperPrepareLabel')}
                    description={t('twoFactorStepperPrepareDescription')}
                  >
                    {!setupQr ? (
                      <Stack gap="sm" pt={4}>
                        <Text size="sm">{t('twoFactorStepInstall')}</Text>
                        <Group gap="xs" wrap="wrap">
                          <TotpStoreLinkButton
                            href={GOOGLE_PLAY_AUTHENTICATOR}
                            icon={<IconBrandGooglePlay size={20} aria-hidden />}
                            primaryLabel={t('twoFactorStoreAppName')}
                            secondaryLabel={t('twoFactorStoreChannelGooglePlay')}
                          />
                          <TotpStoreLinkButton
                            href={APP_STORE_AUTHENTICATOR}
                            icon={<IconBrandApple size={20} aria-hidden />}
                            primaryLabel={t('twoFactorStoreAppName')}
                            secondaryLabel={t('twoFactorStoreChannelAppStore')}
                          />
                          <TotpStoreLinkButton
                            href={GOOGLE_PLAY_MS_AUTHENTICATOR}
                            icon={<IconBrandGooglePlay size={20} aria-hidden />}
                            primaryLabel={t('twoFactorMsAuthAppName')}
                            secondaryLabel={t('twoFactorStoreChannelGooglePlay')}
                          />
                          <TotpStoreLinkButton
                            href={APP_STORE_MS_AUTHENTICATOR}
                            icon={<IconBrandApple size={20} aria-hidden />}
                            primaryLabel={t('twoFactorMsAuthAppName')}
                            secondaryLabel={t('twoFactorStoreChannelAppStore')}
                          />
                        </Group>
                        <Button loading={setupM.isPending} onClick={() => setupM.mutate()}>
                          {t('twoFactorInstalledContinueCta')}
                        </Button>
                      </Stack>
                    ) : null}
                  </Stepper.Step>
                  <Stepper.Step
                    label={t('twoFactorStepperScanVerifyLabel')}
                    description={t('twoFactorStepperScanVerifyDescription')}
                  >
                    {setupQr ? (
                      <Stack gap="md" pt={4}>
                        <Box pos="relative" style={{ maxWidth: 280, margin: '0 auto' }}>
                          <Image src={setupQr} alt="" radius="sm" />
                          {setupExpired ? (
                            <Box
                              pos="absolute"
                              inset={0}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background:
                                  'light-dark(rgba(255,255,255,0.92), rgba(26,27,30,0.92))',
                                borderRadius: 'var(--mantine-radius-sm)',
                              }}
                            >
                              <Stack gap="sm" align="center" p="md">
                                <Text fw={600} ta="center">
                                  {t('twoFactorQrExpired')}
                                </Text>
                                <Button
                                  variant="default"
                                  loading={setupM.isPending}
                                  onClick={() => setupM.mutate()}
                                >
                                  {t('twoFactorRegenerateQr')}
                                </Button>
                              </Stack>
                            </Box>
                          ) : null}
                        </Box>
                        <TotpPinFieldBlock
                          label={t('twoFactorTokenLabel')}
                          value={confirmToken}
                          onChange={setConfirmToken}
                          pinDisabled={confirmM.isPending || setupExpired}
                        >
                          <Button
                            size="sm"
                            loading={confirmM.isPending}
                            disabled={!confirmComplete || setupExpired || confirmM.isPending}
                            onClick={() => confirmM.mutate(confirmToken)}
                            w="100%"
                          >
                            {t('twoFactorVerifyEnable')}
                          </Button>
                        </TotpPinFieldBlock>
                      </Stack>
                    ) : null}
                  </Stepper.Step>
                </Stepper>
              </Stack>
            )}
          </Paper>
        ) : null}
      </Stack>
    </Container>
  )
}
