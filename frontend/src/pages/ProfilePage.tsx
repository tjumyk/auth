import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Container,
  Divider,
  FileButton,
  Group,
  Paper,
  PasswordInput,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDocumentTitle } from '@mantine/hooks'
import { IconArrowLeft, IconUser } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import {
  ACCOUNT_ME_QUERY_KEY,
  fetchAccountMe,
  fetchExternalAuthProvider,
  putAccountAvatar,
  putAccountProfile,
  putAccountPassword,
} from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import type { AccountMeUser } from '@/models/user'
import { siteConfig } from '@/models/siteConfig'
import { groupNameToBadgeColor } from '@/utils/groupBadgeColor'
import { validateNewPassword, validateRepeatNewPassword } from '@/utils/passwordValidation'
import { formatPasswordServiceError } from '@/utils/passwordErrorMessage'
import { PROFILE_SECTION_DOM_IDS, type AppLocationScrollState } from '@/models/locationScrollState'
import {
  normalizeMobile,
  profileErrorFromUnknown,
  validateMobile,
  validateNickname,
  validateRealName,
} from '@/utils/profileValidation'
import { userAvatarSrc } from '@/utils/siteAssetUrl'

const AVATAR_ACCEPT = 'image/png,image/jpeg,image/jpg,image/gif'
const AVATAR_MAX_BYTES = 262_144

function validateAvatarFile(
  file: File,
  t: (key: string) => string,
): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase()
  const okExt = ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif'
  if (!okExt) {
    return t('avatarInvalidType')
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return t('avatarTooLarge')
  }
  return null
}

function ProfilePageSkeleton(): React.ReactElement {
  const { t } = useI18n()
  return (
    <Stack gap="lg" aria-busy="true" aria-label={t('profileLoading')}>
      <Paper p="md" radius="md" withBorder shadow="xs">
        <Skeleton height={18} width={140} mb="md" />
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {Array.from({ length: 4 }).map((_, i) => (
            <Stack key={i} gap={8}>
              <Skeleton height={10} width="32%" />
              <Skeleton height={18} width="85%" />
            </Stack>
          ))}
        </SimpleGrid>
      </Paper>
      <Paper p="md" radius="md" withBorder shadow="xs">
        <Skeleton height={18} width={100} mb="md" />
        <Stack gap="md">
          <Stack gap={6}>
            <Skeleton height={14} width={72} />
            <Skeleton height={36} />
            <Skeleton height={12} width="100%" />
          </Stack>
          <Skeleton height={36} width={140} />
        </Stack>
      </Paper>
      <Paper p="md" radius="md" withBorder shadow="xs">
        <Skeleton height={18} width={88} mb="md" />
        <Stack gap="md" align="flex-start">
          <Skeleton height={80} width={80} radius="md" />
          <Skeleton height={12} width="75%" />
          <Skeleton height={36} width={128} />
        </Stack>
      </Paper>
      <Paper p="md" radius="md" withBorder shadow="xs">
        <Skeleton height={18} width={110} mb="md" />
        <Stack gap="md">
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={36} />
          <Skeleton height={12} width="55%" />
          <Skeleton height={36} width={132} />
        </Stack>
      </Paper>
    </Stack>
  )
}

export function ProfilePage(): React.ReactElement {
  const { t, locale } = useI18n()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [profileError, setProfileError] = useState<BasicError | null>(null)
  const [realNameError, setRealNameError] = useState<BasicError | null>(null)
  const [mobileError, setMobileError] = useState<BasicError | null>(null)
  const [realNameOk, setRealNameOk] = useState(false)
  const [mobileOk, setMobileOk] = useState(false)
  const [avatarError, setAvatarError] = useState<BasicError | null>(null)
  const [passwordError, setPasswordError] = useState<BasicError | null>(null)
  const [profileOk, setProfileOk] = useState(false)
  const [avatarOk, setAvatarOk] = useState(false)
  const [passwordOk, setPasswordOk] = useState(false)

  useDocumentTitle(`${siteConfig.name} · ${t('profilePageTitle')}`)

  const meQ = useQuery({
    queryKey: ACCOUNT_ME_QUERY_KEY,
    queryFn: fetchAccountMe,
  })

  const externalProviderId = meQ.data?.external_auth_provider_id ?? null
  const providerQ = useQuery({
    queryKey: ['externalAuthProvider', externalProviderId],
    queryFn: () => fetchExternalAuthProvider(externalProviderId!),
    enabled: Boolean(externalProviderId),
  })

  const nickForm = useForm({
    initialValues: { nickname: '' },
    validate: {
      nickname: (v) => validateNickname(v, t),
    },
  })

  const realNameForm = useForm({
    initialValues: { real_name: '' },
    validate: {
      real_name: (v) => validateRealName(v, t),
    },
  })

  const mobileForm = useForm({
    initialValues: { mobile: '' },
    validate: {
      mobile: (v) => validateMobile(v, t),
    },
  })

  useEffect(() => {
    if (!meQ.isSuccess || !meQ.data) {
      return
    }
    nickForm.setValues({ nickname: meQ.data.nickname ?? '' })
    realNameForm.setValues({ real_name: meQ.data.real_name ?? '' })
    mobileForm.setValues({ mobile: meQ.data.mobile ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate from /me when profile fields change
  }, [meQ.isSuccess, meQ.data?.id, meQ.data?.nickname, meQ.data?.real_name, meQ.data?.mobile])

  const pwdForm = useForm({
    initialValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
    validate: {
      old_password: (v) => (v.length > 0 ? null : t('fieldRequired')),
      new_password: (v) => validateNewPassword(v, t),
      confirm_password: (v, values) => validateRepeatNewPassword(v, values.new_password, t),
    },
  })

  const onProfileFieldSuccess = (user: AccountMeUser): void => {
    queryClient.setQueryData(['whoami'], user)
    void queryClient.invalidateQueries({ queryKey: ACCOUNT_ME_QUERY_KEY })
  }

  const nickM = useMutation({
    mutationFn: (nickname: string) => putAccountProfile({ nickname: nickname.trim() }),
    onSuccess: (user) => {
      setProfileError(null)
      setProfileOk(true)
      onProfileFieldSuccess(user)
    },
    onError: (err) => {
      setProfileOk(false)
      setProfileError(profileErrorFromUnknown(err, t))
    },
  })

  const realNameM = useMutation({
    mutationFn: (real_name: string) => putAccountProfile({ real_name: real_name.trim() }),
    onSuccess: (user) => {
      setRealNameError(null)
      setRealNameOk(true)
      onProfileFieldSuccess(user)
    },
    onError: (err) => {
      setRealNameOk(false)
      setRealNameError(profileErrorFromUnknown(err, t))
    },
  })

  const mobileM = useMutation({
    mutationFn: (raw: string) => {
      const trimmed = raw.trim()
      const mobile = trimmed ? (normalizeMobile(trimmed) ?? trimmed) : ''
      return putAccountProfile({ mobile })
    },
    onSuccess: (user) => {
      setMobileError(null)
      setMobileOk(true)
      onProfileFieldSuccess(user)
    },
    onError: (err) => {
      setMobileOk(false)
      setMobileError(profileErrorFromUnknown(err, t))
    },
  })

  const avatarM = useMutation({
    mutationFn: (file: File) => putAccountAvatar(file),
    onSuccess: (user) => {
      setAvatarError(null)
      setAvatarOk(true)
      queryClient.setQueryData(['whoami'], user)
      queryClient.setQueryData<AccountMeUser | undefined>(ACCOUNT_ME_QUERY_KEY, (prev) =>
        prev ? { ...prev, ...user } : prev,
      )
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_ME_QUERY_KEY })
    },
    onError: (err) => {
      setAvatarOk(false)
      setAvatarError(getBasicErrorFromUnknown(err))
    },
  })

  const pwdM = useMutation({
    mutationFn: (v: { old_password: string; new_password: string }) =>
      putAccountPassword(v.old_password, v.new_password),
    onSuccess: () => {
      setPasswordError(null)
      setPasswordOk(true)
      pwdForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['whoami'] })
    },
    onError: (err) => {
      setPasswordOk(false)
      setPasswordError(getBasicErrorFromUnknown(err))
    },
  })

  const user = meQ.data

  useEffect(() => {
    if (!user) {
      return
    }
    const scrollTo = (location.state as AppLocationScrollState | null)?.scrollTo
    if (!scrollTo) {
      return
    }
    const domId = PROFILE_SECTION_DOM_IDS[scrollTo]
    if (!domId) {
      return
    }
    const id = window.setTimeout(() => {
      document.getElementById(domId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => window.clearTimeout(id)
  }, [user, location.key, location.state])
  const avatarSrc = user ? userAvatarSrc(user) : null
  const showLocalPasswordForm = Boolean(
    user && (!user.external_auth_provider_id || !user.external_auth_enforced),
  )

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <Button
            component={Link}
            to="/"
            variant="subtle"
            size="compact-sm"
            mb="xs"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('backToHome')}
          </Button>
          <Group gap="sm">
            <IconUser size={28} stroke={1.5} />
            <Title order={2}>{t('profileHeading')}</Title>
          </Group>
        </div>

        {meQ.isPending ? <ProfilePageSkeleton /> : null}

        {meQ.isError ? (
          <Alert color="red" title={t('profileLoadFailed')}>
            <Anchor component="button" type="button" onClick={() => meQ.refetch()}>
              {t('retry')}
            </Anchor>
          </Alert>
        ) : null}

        {user ? (
          <>
            <Paper id="profile-account-details" p="md" radius="md" withBorder shadow="xs">
              <Title order={4} mb="md">
                {t('accountDetails')}
              </Title>
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    {t('profileName')}
                  </Text>
                  <Text>{user.name}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    {t('profileEmail')}
                  </Text>
                  <Text>{user.email}</Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    {t('accountStatus')}
                  </Text>
                  <Text c={user.is_active ? 'teal' : 'red'}>
                    {user.is_active ? t('statusActive') : t('statusInactive')}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
                    {t('groups')}
                  </Text>
                  {user.groups?.length ? (
                    <Group gap="xs" mt={4}>
                      {user.groups.map((g) => {
                        const desc = g.description?.trim()
                        return desc ? (
                          <Tooltip key={g.id} label={desc} withArrow>
                            <Badge variant="light" size="sm" color={groupNameToBadgeColor(g.name)}>
                              {g.name}
                            </Badge>
                          </Tooltip>
                        ) : (
                          <Badge
                            key={g.id}
                            variant="light"
                            size="sm"
                            color={groupNameToBadgeColor(g.name)}
                          >
                            {g.name}
                          </Badge>
                        )
                      })}
                    </Group>
                  ) : (
                    <Text c="dimmed" size="sm">
                      {t('noGroups')}
                    </Text>
                  )}
                </div>
              </SimpleGrid>
            </Paper>

            <Paper id="profile-nickname" p="md" radius="md" withBorder shadow="xs">
              <Title order={4} mb="md">
                {t('nicknameSection')}
              </Title>
              {profileOk ? (
                <Alert color="green" mb="md" onClose={() => setProfileOk(false)} withCloseButton>
                  {t('profileUpdated')}
                </Alert>
              ) : null}
              {profileError ? (
                <Alert color="red" mb="md" title={profileError.msg} onClose={() => setProfileError(null)} withCloseButton>
                  {profileError.detail}
                </Alert>
              ) : null}
              <form
                key={locale}
                onSubmit={nickForm.onSubmit((values) => {
                  setProfileOk(false)
                  nickM.mutate(values.nickname.trim())
                })}
              >
                <Stack gap="md">
                  <TextInput
                    label={t('nickname')}
                    description={t('nicknameHint')}
                    placeholder={t('nicknamePlaceholder')}
                    {...nickForm.getInputProps('nickname')}
                  />
                  <Button type="submit" loading={nickM.isPending}>
                    {t('saveNickname')}
                  </Button>
                </Stack>
              </form>
            </Paper>

            <Paper id="profile-real-name" p="md" radius="md" withBorder shadow="xs">
              <Title order={4} mb="md">
                {t('realNameSection')}
              </Title>
              {realNameOk ? (
                <Alert color="green" mb="md" onClose={() => setRealNameOk(false)} withCloseButton>
                  {t('profileUpdated')}
                </Alert>
              ) : null}
              {realNameError ? (
                <Alert color="red" mb="md" title={realNameError.msg} onClose={() => setRealNameError(null)} withCloseButton>
                  {realNameError.detail}
                </Alert>
              ) : null}
              <form
                key={`${locale}-real`}
                onSubmit={realNameForm.onSubmit((values) => {
                  setRealNameOk(false)
                  realNameM.mutate(values.real_name)
                })}
              >
                <Stack gap="md">
                  <TextInput
                    label={t('realName')}
                    description={t('realNameHint')}
                    {...realNameForm.getInputProps('real_name')}
                  />
                  <Button type="submit" loading={realNameM.isPending}>
                    {t('saveRealName')}
                  </Button>
                </Stack>
              </form>
            </Paper>

            <Paper id="profile-mobile" p="md" radius="md" withBorder shadow="xs">
              <Title order={4} mb="md">
                {t('mobileSection')}
              </Title>
              {mobileOk ? (
                <Alert color="green" mb="md" onClose={() => setMobileOk(false)} withCloseButton>
                  {t('profileUpdated')}
                </Alert>
              ) : null}
              {mobileError ? (
                <Alert color="red" mb="md" title={mobileError.msg} onClose={() => setMobileError(null)} withCloseButton>
                  {mobileError.detail}
                </Alert>
              ) : null}
              <form
                key={`${locale}-mobile`}
                onSubmit={mobileForm.onSubmit((values) => {
                  setMobileOk(false)
                  mobileM.mutate(values.mobile)
                })}
              >
                <Stack gap="md">
                  <TextInput
                    label={t('mobile')}
                    description={t('mobileHint')}
                    {...mobileForm.getInputProps('mobile')}
                  />
                  <Button type="submit" loading={mobileM.isPending}>
                    {t('saveMobile')}
                  </Button>
                </Stack>
              </form>
            </Paper>

            <Paper id="profile-avatar" p="md" radius="md" withBorder shadow="xs">
              <Title order={4} mb="md">
                {t('avatarSection')}
              </Title>
              {avatarOk ? (
                <Alert color="green" mb="md" onClose={() => setAvatarOk(false)} withCloseButton>
                  {t('avatarUpdated')}
                </Alert>
              ) : null}
              {avatarError ? (
                <Alert color="red" mb="md" title={avatarError.msg} onClose={() => setAvatarError(null)} withCloseButton>
                  {avatarError.detail}
                </Alert>
              ) : null}
              <Stack gap="md" align="flex-start">
                {avatarSrc ? (
                  <Avatar src={avatarSrc} alt="" size={80} radius="md" />
                ) : (
                  <Text c="dimmed" size="sm">
                    {t('noAvatar')}
                  </Text>
                )}
                <Text size="xs" c="dimmed">
                  {t('avatarHint')}
                </Text>
                <FileButton
                  accept={AVATAR_ACCEPT}
                  onChange={(file) => {
                    setAvatarOk(false)
                    setAvatarError(null)
                    if (!file) {
                      return
                    }
                    const msg = validateAvatarFile(file, t)
                    if (msg) {
                      setAvatarError({ msg })
                      return
                    }
                    avatarM.mutate(file)
                  }}
                >
                  {(props) => (
                    <Button {...props} loading={avatarM.isPending}>
                      {t('uploadAvatar')}
                    </Button>
                  )}
                </FileButton>
              </Stack>
            </Paper>

            <Paper id="profile-password" p="md" radius="md" withBorder shadow="xs">
              <Title order={4} mb="md">
                {t('passwordSection')}
              </Title>
              <Stack gap="md">
                {passwordOk ? (
                  <Alert color="green" onClose={() => setPasswordOk(false)} withCloseButton>
                    {t('passwordUpdated')}
                  </Alert>
                ) : null}
                {passwordError ? (
                  <Alert
                    color="red"
                    title={formatPasswordServiceError(passwordError, t)?.title ?? passwordError.msg}
                    onClose={() => setPasswordError(null)}
                    withCloseButton
                  >
                    {formatPasswordServiceError(passwordError, t)?.detail ?? passwordError.detail}
                  </Alert>
                ) : null}
                {showLocalPasswordForm ? (
                  <form
                    key={`pwd-${locale}`}
                    onSubmit={pwdForm.onSubmit((values) => {
                      setPasswordOk(false)
                      pwdM.mutate({
                        old_password: values.old_password,
                        new_password: values.new_password,
                      })
                    })}
                  >
                    <Stack gap="md">
                      <PasswordInput
                        label={t('currentPassword')}
                        {...pwdForm.getInputProps('old_password')}
                      />
                      <PasswordInput
                        label={t('newPassword')}
                        {...pwdForm.getInputProps('new_password')}
                      />
                      <PasswordInput
                        label={t('confirmNewPassword')}
                        {...pwdForm.getInputProps('confirm_password')}
                      />
                      <Text size="xs" c="dimmed">
                        {t('passwordLengthHint')} {t('passwordComplexityHint')}
                      </Text>
                      <Button type="submit" loading={pwdM.isPending}>
                        {t('updatePassword')}
                      </Button>
                    </Stack>
                  </form>
                ) : null}
                {externalProviderId ? (
                  <>
                    {!showLocalPasswordForm ? (
                      <Text size="sm" c="dimmed">
                        {t('passwordManagedExternally')}
                      </Text>
                    ) : null}
                    {showLocalPasswordForm ? <Divider /> : null}
                    {providerQ.isPending ? <Skeleton height={56} /> : null}
                    {providerQ.isError ? (
                      <Alert color="red" title={t('passwordExternalLoadFailed')}>
                        <Anchor component="button" type="button" onClick={() => void providerQ.refetch()}>
                          {t('retry')}
                        </Anchor>
                      </Alert>
                    ) : null}
                    {providerQ.data ? (
                      providerQ.data.update_password_url ? (
                        <Stack gap="sm">
                          <Text size="sm">
                            {t('passwordExternalIntro', { providerName: providerQ.data.name })}
                          </Text>
                          <Button
                            component="a"
                            href={providerQ.data.update_password_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {t('passwordExternalButton', { providerName: providerQ.data.name })}
                          </Button>
                        </Stack>
                      ) : (
                        <Text size="sm">
                          {t('passwordExternalNoLink', { providerName: providerQ.data.name })}
                        </Text>
                      )
                    ) : null}
                  </>
                ) : null}
              </Stack>
            </Paper>

            <Paper p="md" radius="md" withBorder shadow="xs">
              <Title order={4} mb="md">
                {t('twoFactorSettingsTitle')}
              </Title>
              <Stack gap="sm" align="flex-start">
                <Text size="sm" c="dimmed">
                  {t('twoFactorSectionBlurb')}
                </Text>
                <Text size="sm" fw={500}>
                  {user.is_two_factor_enabled ? t('twoFactorStatusOn') : t('twoFactorStatusOff')}
                </Text>
                <Button component={Link} to="/account/two-factor" variant="light">
                  {t('twoFactorManageCta')}
                </Button>
              </Stack>
            </Paper>
          </>
        ) : null}
      </Stack>
    </Container>
  )
}
