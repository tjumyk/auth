import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Container,
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
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDocumentTitle } from '@mantine/hooks'
import { IconUser } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  ACCOUNT_ME_QUERY_KEY,
  fetchAccountMe,
  putAccountAvatar,
  putAccountNickname,
  putAccountPassword,
} from '@/api/account'
import { getBasicErrorFromUnknown } from '@/api/client'
import { useI18n } from '@/hooks/useI18n'
import type { BasicError } from '@/models/apiError'
import { siteConfig } from '@/models/siteConfig'

const AVATAR_ACCEPT = 'image/png,image/jpeg,image/jpg,image/gif'
const AVATAR_MAX_BYTES = 262_144

function nicknameValidator(
  value: string,
  invalidMsg: string,
): string | null {
  const v = value.trim()
  if (v.length === 0) {
    return null
  }
  if (!/^[ \w-]{3,16}$/.test(v)) {
    return invalidMsg
  }
  return null
}

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
  const queryClient = useQueryClient()
  const [profileError, setProfileError] = useState<BasicError | null>(null)
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

  const nickForm = useForm({
    initialValues: { nickname: '' },
    validate: {
      nickname: (v) => nicknameValidator(v, t('nicknameInvalid')),
    },
  })

  useEffect(() => {
    if (!meQ.isSuccess || !meQ.data) {
      return
    }
    nickForm.setValues({ nickname: meQ.data.nickname ?? '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate from /me when server id or nickname changes
  }, [meQ.isSuccess, meQ.data?.id, meQ.data?.nickname])

  const pwdForm = useForm({
    initialValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
    validate: {
      old_password: (v) => (v.length > 0 ? null : t('fieldRequired')),
      new_password: (v) => {
        if (v.length < 8 || v.length > 20) {
          return t('passwordLengthHint')
        }
        return null
      },
      confirm_password: (v, values) =>
        v === values.new_password ? null : t('passwordsDoNotMatch'),
    },
  })

  const nickM = useMutation({
    mutationFn: (nickname: string) => putAccountNickname(nickname.trim()),
    onSuccess: (user) => {
      setProfileError(null)
      setProfileOk(true)
      queryClient.setQueryData(['whoami'], user)
      void queryClient.invalidateQueries({ queryKey: ACCOUNT_ME_QUERY_KEY })
    },
    onError: (err) => {
      setProfileOk(false)
      setProfileError(getBasicErrorFromUnknown(err))
    },
  })

  const avatarM = useMutation({
    mutationFn: (file: File) => putAccountAvatar(file),
    onSuccess: (user) => {
      setAvatarError(null)
      setAvatarOk(true)
      queryClient.setQueryData(['whoami'], user)
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
    },
    onError: (err) => {
      setPasswordOk(false)
      setPasswordError(getBasicErrorFromUnknown(err))
    },
  })

  const user = meQ.data
  const avatarSrc = user?.avatar_full ?? user?.avatar ?? null
  const canChangePassword = !user?.external_auth_provider_id

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
            <Paper p="md" radius="md" withBorder shadow="xs">
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
                      {user.groups.map((g) => (
                        <Badge key={g.id} variant="light" size="sm">
                          {g.name}
                        </Badge>
                      ))}
                    </Group>
                  ) : (
                    <Text c="dimmed" size="sm">
                      {t('noGroups')}
                    </Text>
                  )}
                </div>
              </SimpleGrid>
            </Paper>

            <Paper p="md" radius="md" withBorder shadow="xs">
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
                  nickM.mutate(values.nickname)
                })}
              >
                <Stack gap="md">
                  <TextInput
                    label={t('nickname')}
                    description={t('nicknameHint')}
                    {...nickForm.getInputProps('nickname')}
                  />
                  <Button type="submit" loading={nickM.isPending}>
                    {t('saveNickname')}
                  </Button>
                </Stack>
              </form>
            </Paper>

            <Paper p="md" radius="md" withBorder shadow="xs">
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

            <Paper p="md" radius="md" withBorder shadow="xs">
              <Title order={4} mb="md">
                {t('passwordSection')}
              </Title>
              {!canChangePassword ? (
                <Text size="sm" c="dimmed" mb="md">
                  {t('passwordManagedExternally')}
                </Text>
              ) : null}
              {passwordOk ? (
                <Alert color="green" mb="md" onClose={() => setPasswordOk(false)} withCloseButton>
                  {t('passwordUpdated')}
                </Alert>
              ) : null}
              {passwordError ? (
                <Alert
                  color="red"
                  mb="md"
                  title={passwordError.msg}
                  onClose={() => setPasswordError(null)}
                  withCloseButton
                >
                  {passwordError.detail}
                </Alert>
              ) : null}
              {canChangePassword ? (
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
                    <PasswordInput label={t('currentPassword')} {...pwdForm.getInputProps('old_password')} />
                    <PasswordInput label={t('newPassword')} {...pwdForm.getInputProps('new_password')} />
                    <PasswordInput
                      label={t('confirmNewPassword')}
                      {...pwdForm.getInputProps('confirm_password')}
                    />
                    <Text size="xs" c="dimmed">
                      {t('passwordLengthHint')}
                    </Text>
                    <Button type="submit" loading={pwdM.isPending}>
                      {t('updatePassword')}
                    </Button>
                  </Stack>
                </form>
              ) : null}
            </Paper>
          </>
        ) : null}
      </Stack>
    </Container>
  )
}
