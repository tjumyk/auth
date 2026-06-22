import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  FileButton,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { useDisclosure } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { IconArrowLeft } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import {
  ADMIN_USER_EXT_INFO_QK,
  ADMIN_USER_LOGIN_RECORDS_QK,
  ADMIN_USER_QK,
  ADMIN_USERS_QK,
  deleteAdminUser,
  getAdminConfirmEmailUrl,
  getAdminUser,
  getAdminUserExternalInfo,
  getAdminImpersonateUser,
  getAdminUserLoginRecords,
  postAdminUserReconfirmEmail,
  putAdminUserAvatar,
  putAdminUserProfile,
  setAdminUserActive,
} from '@/api/admin'
import { getBasicErrorFromUnknown } from '@/api/client'
import { ConfirmEmailUrlField } from '@/components/admin/ConfirmEmailUrlField'
import { useI18n } from '@/hooks/useI18n'
import { externalUserInfoEnabled } from '@/models/adminFeaturesConfig'
import { mailEnabled } from '@/models/mailConfig'
import type { BasicError } from '@/models/apiError'
import type { AdminUser } from '@/models/admin'
import {
  normalizeMobile,
  profileErrorFromUnknown,
  validateMobile,
  validateNickname,
  validateRealName,
} from '@/utils/profileValidation'
import { userAvatarSrc } from '@/utils/siteAssetUrl'
import { formatPasswordExpiryDate } from '@/utils/passwordExpiry'

const AVATAR_MAX_BYTES = 262_144

function validateAvatarFile(file: File, t: (k: string) => string): string | null {
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

export function AdminUserEditPage(): React.ReactElement {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const params = useParams()
  const uid = Number.parseInt(String(params.uid), 10)
  const validUid = Number.isFinite(uid)

  const [pageError, setPageError] = useState<BasicError | null>(null)
  const [avatarErr, setAvatarErr] = useState<string | null>(null)
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false)
  const [impersonateOpened, { open: openImpersonate, close: closeImpersonate }] = useDisclosure(false)
  const [resetConfirmOpened, { open: openResetConfirm, close: closeResetConfirm }] = useDisclosure(false)

  const userQ = useQuery({
    queryKey: ADMIN_USER_QK(uid, true),
    queryFn: () => getAdminUser(uid, true),
    enabled: validUid,
  })

  const recordsQ = useQuery({
    queryKey: ADMIN_USER_LOGIN_RECORDS_QK(uid, true),
    queryFn: () => getAdminUserLoginRecords(uid, true),
    enabled: validUid && userQ.isSuccess,
  })

  const extInfoQ = useQuery({
    queryKey: ADMIN_USER_EXT_INFO_QK(uid),
    queryFn: () => getAdminUserExternalInfo(uid),
    enabled: false,
  })

  const nickForm = useForm({
    initialValues: { nickname: '' },
    validate: {
      nickname: (v) => {
        const s = v.trim()
        if (s.length === 0) return null
        return validateNickname(v, t)
      },
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
    if (userQ.data) {
      nickForm.setValues({ nickname: userQ.data.nickname ?? '' })
      realNameForm.setValues({ real_name: userQ.data.real_name ?? '' })
      mobileForm.setValues({ mobile: userQ.data.mobile ?? '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate when user loads
  }, [userQ.data?.id, userQ.data?.nickname, userQ.data?.real_name, userQ.data?.mobile])

  const invalidateUser = (): void => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QK })
    void queryClient.invalidateQueries({ queryKey: ADMIN_USER_QK(uid, true) })
  }

  const mapPageError = (e: unknown): void => {
    setPageError(profileErrorFromUnknown(e, t))
  }

  const nickM = useMutation({
    mutationFn: (nickname: string) => putAdminUserProfile(uid, { nickname: nickname.trim() }),
    onSuccess: () => {
      setPageError(null)
      invalidateUser()
    },
    onError: mapPageError,
  })

  const realNameM = useMutation({
    mutationFn: (real_name: string) => putAdminUserProfile(uid, { real_name: real_name.trim() }),
    onSuccess: () => {
      setPageError(null)
      invalidateUser()
    },
    onError: mapPageError,
  })

  const mobileM = useMutation({
    mutationFn: (raw: string) => {
      const trimmed = raw.trim()
      const mobile = trimmed ? (normalizeMobile(trimmed) ?? trimmed) : ''
      return putAdminUserProfile(uid, { mobile })
    },
    onSuccess: () => {
      setPageError(null)
      invalidateUser()
    },
    onError: mapPageError,
  })

  const avatarM = useMutation({
    mutationFn: (file: File) => putAdminUserAvatar(uid, file),
    onSuccess: () => {
      setAvatarErr(null)
      invalidateUser()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const activeM = useMutation({
    mutationFn: (active: boolean) => setAdminUserActive(uid, active),
    onSuccess: () => {
      setPageError(null)
      invalidateUser()
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const [revealedConfirmUrl, setRevealedConfirmUrl] = useState<string | null>(null)

  const reconfirmM = useMutation({
    mutationFn: () => postAdminUserReconfirmEmail(uid),
    onSuccess: (result) => {
      closeResetConfirm()
      setPageError(null)
      invalidateUser()
      if (result.url) {
        setRevealedConfirmUrl(result.url)
      } else {
        setRevealedConfirmUrl(null)
      }
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const showConfirmUrlM = useMutation({
    mutationFn: () => getAdminConfirmEmailUrl(uid),
    onSuccess: (url) => {
      setPageError(null)
      setRevealedConfirmUrl(url)
    },
    onError: (e) => {
      const err = getBasicErrorFromUnknown(e) ?? { msg: 'Request failed' }
      notifications.show({
        color: 'red',
        title: err.msg,
        message: err.detail ?? undefined,
      })
    },
  })

  const deleteM = useMutation({
    mutationFn: () => deleteAdminUser(uid),
    onSuccess: () => {
      closeDelete()
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QK })
      navigate('/admin/account/users')
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const impersonateM = useMutation({
    mutationFn: () => getAdminImpersonateUser(uid),
    onSuccess: () => {
      closeImpersonate()
      void queryClient.invalidateQueries({ queryKey: ['whoami'] })
      void queryClient.invalidateQueries({ queryKey: ['accountMe'] })
      navigate('/', { replace: true })
    },
    onError: (e) => setPageError(getBasicErrorFromUnknown(e)),
  })

  const loadExtInfo = (): void => {
    void extInfoQ.refetch()
  }

  if (!validUid) {
    return (
      <Stack p="md" gap="md">
        <Group justify="flex-start" wrap="nowrap">
          <Button
            component={Link}
            to="/admin/account/users"
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('adminUsersBackToList')}
          </Button>
        </Group>
        <Alert color="red">{t('adminUserInvalidId')}</Alert>
      </Stack>
    )
  }

  if (userQ.isPending) {
    return (
      <Stack p="md" gap="md">
        <Group justify="flex-start" wrap="nowrap">
          <Button
            component={Link}
            to="/admin/account/users"
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('adminUsersBackToList')}
          </Button>
        </Group>
        <Stack align="center" py="xl">
          <Loader />
        </Stack>
      </Stack>
    )
  }

  if (userQ.isError || !userQ.data) {
    return (
      <Stack p="md" gap="md">
        <Group justify="flex-start" wrap="nowrap">
          <Button
            component={Link}
            to="/admin/account/users"
            variant="subtle"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
          >
            {t('adminUsersBackToList')}
          </Button>
        </Group>
        <Alert color="red">{t('adminUserLoadFailed')}</Alert>
      </Stack>
    )
  }

  const user: AdminUser = userQ.data
  const avatarSrc = userAvatarSrc(user)

  return (
    <Stack gap="md" p="md">
      <Group justify="flex-start" wrap="nowrap">
        <Button
          component={Link}
          to="/admin/account/users"
          variant="subtle"
          size="sm"
          leftSection={<IconArrowLeft size={16} />}
        >
          {t('adminUsersBackToList')}
        </Button>
      </Group>
      <Title order={2}>
        {user.name} · {t('adminTitleUserDetail')}
      </Title>

      {pageError ? (
        <Alert color="red" title={pageError.msg} onClose={() => setPageError(null)} withCloseButton>
          {pageError.detail}
        </Alert>
      ) : null}

      <Paper p="md" withBorder shadow="xs">
        <Title order={4} mb="sm">
          {t('accountStatus')}
        </Title>
        <Switch
          label={t('statusActive')}
          checked={user.is_active}
          disabled={activeM.isPending}
          onChange={(e) => activeM.mutate(e.currentTarget.checked)}
        />
      </Paper>

      <Paper p="md" withBorder shadow="xs">
        <Title order={4} mb="sm">
          {t('adminSecuritySection')}
        </Title>
        <Stack gap="xs">
          <Group gap="xs">
            <Text size="sm" fw={500}>
              {t('twoFactorSettingsTitle')}:
            </Text>
            <Badge color={user.is_two_factor_enabled ? 'teal' : 'gray'} variant="light">
              {user.is_two_factor_enabled ? t('adminTwoFactorOn') : t('adminTwoFactorOff')}
            </Badge>
          </Group>
          <Text size="sm">
            {t('adminPasswordChangedAt')}:{' '}
            {user.password_changed_at
              ? formatPasswordExpiryDate(user.password_changed_at, locale)
              : '—'}
          </Text>
          <Text size="sm">
            {t('adminUsersColPasswordExpiry')}:{' '}
            {user.password_expires_at
              ? formatPasswordExpiryDate(user.password_expires_at, locale)
              : t('adminPasswordExpiryNone')}
          </Text>
          <Group gap="xs">
            <Text size="sm" fw={500}>
              {t('adminPasswordExpiryStatus')}:
            </Text>
            <Badge
              color={
                user.password_expiry_status === 'expired'
                  ? 'red'
                  : user.password_expiry_status === 'warning_1week'
                    ? 'orange'
                    : user.password_expiry_status === 'warning_1month'
                      ? 'yellow'
                      : 'gray'
              }
              variant="light"
            >
              {user.password_expiry_status ?? 'none'}
            </Badge>
          </Group>
        </Stack>
      </Paper>

      <Paper p="md" withBorder shadow="xs">
        <Title order={4} mb="sm">
          {t('profileHeading')}
        </Title>
        <Stack gap="md" key={locale} maw={400}>
          <TextInput label={t('profileName')} value={user.name} readOnly disabled />
          <TextInput label={t('profileEmail')} value={user.email} readOnly disabled />
          <form
            onSubmit={nickForm.onSubmit((v) => {
              nickM.mutate(v.nickname)
            })}
          >
            <Stack gap="sm">
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
          <form
            onSubmit={realNameForm.onSubmit((v) => {
              realNameM.mutate(v.real_name)
            })}
          >
            <Stack gap="sm">
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
          <form
            onSubmit={mobileForm.onSubmit((v) => {
              mobileM.mutate(v.mobile)
            })}
          >
            <Stack gap="sm">
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
        </Stack>
      </Paper>

      <Paper p="md" withBorder shadow="xs">
        <Title order={4} mb="sm">
          {t('avatarSection')}
        </Title>
        <Group align="flex-end" gap="md">
          <Avatar src={avatarSrc} size="lg" radius="md" />
          <Stack gap={4}>
            {avatarErr ? (
              <Text size="sm" c="red">
                {avatarErr}
              </Text>
            ) : null}
            <FileButton
              onChange={(file) => {
                if (!file) return
                const err = validateAvatarFile(file, t)
                if (err) {
                  setAvatarErr(err)
                  return
                }
                setAvatarErr(null)
                avatarM.mutate(file)
              }}
              accept="image/png,image/jpeg,image/jpg,image/gif"
            >
              {(props) => (
                <Button {...props} loading={avatarM.isPending} variant="light">
                  {t('uploadAvatar')}
                </Button>
              )}
            </FileButton>
          </Stack>
        </Group>
      </Paper>

      <Paper p="md" withBorder shadow="xs">
        <Title order={4} mb="sm">
          {t('adminUserEmailActions')}
        </Title>
        <Stack gap="sm">
          <Stack gap={4}>
            <Group gap="xs">
              <Text size="sm" c="dimmed">
                {t('adminUsersColEmailConfirmed')}
              </Text>
              {user.is_email_confirmed ? (
                <Badge color="teal" variant="light">
                  {t('adminUsersYes')}
                </Badge>
              ) : (
                <Badge color="orange" variant="light">
                  {t('adminUsersNo')}
                </Badge>
              )}
            </Group>
            {user.is_email_confirmed && user.email_confirmed_at ? (
              <Text size="sm" c="dimmed">
                {t('adminUserEmailConfirmedAt', {
                  date: new Date(user.email_confirmed_at).toLocaleString(
                    locale === 'zh-Hans' ? 'zh-CN' : 'en-US',
                  ),
                })}
              </Text>
            ) : null}
          </Stack>
          {user.is_active ? (
            <>
              <Group>
                <Button variant="light" loading={reconfirmM.isPending} onClick={openResetConfirm}>
                  {mailEnabled ? t('adminUserReconfirmEmail') : t('adminUserResetConfirmUrl')}
                </Button>
                <Button
                  variant="light"
                  loading={showConfirmUrlM.isPending}
                  onClick={() => showConfirmUrlM.mutate()}
                >
                  {t('adminUserShowConfirmUrl')}
                </Button>
              </Group>
              {revealedConfirmUrl ? (
                <ConfirmEmailUrlField
                  url={revealedConfirmUrl}
                  hint={!mailEnabled ? t('mailDisabledConfirmUrlHint') : undefined}
                />
              ) : null}
            </>
          ) : null}
        </Stack>
      </Paper>

      <Paper p="md" withBorder shadow="xs">
        <Title order={4} mb="sm">
          {t('adminUserLoginRecords')}
        </Title>
        {recordsQ.isPending ? (
          <Loader size="sm" />
        ) : recordsQ.isError ? (
          <Text c="red" size="sm">
            {t('adminUserLoginRecordsFailed')}
          </Text>
        ) : (
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('adminUserLoginTime')}</Table.Th>
                <Table.Th>{t('adminUserLoginIp')}</Table.Th>
                <Table.Th>{t('adminUserLoginCountry')}</Table.Th>
                <Table.Th>{t('adminUserLoginSuccess')}</Table.Th>
                <Table.Th>{t('adminUserLoginUa')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(recordsQ.data ?? []).map((r) => (
                <Table.Tr key={r.id}>
                  <Table.Td>{new Date(r.time).toLocaleString(locale === 'zh-Hans' ? 'zh-CN' : 'en-US')}</Table.Td>
                  <Table.Td>{r.ip}</Table.Td>
                  <Table.Td>{r.country ? `${r.country.name} (${r.country.iso_code})` : '—'}</Table.Td>
                  <Table.Td>
                    {r.success ? (
                      <Badge color="teal" variant="light">
                        {t('adminUsersYes')}
                      </Badge>
                    ) : (
                      <Badge color="red" variant="light">
                        {r.reason || t('adminUsersNo')}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" lineClamp={2} style={{ maxWidth: 240 }}>
                      {r.user_agent}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Paper p="md" withBorder shadow="xs">
        <Title order={4} mb="sm">
          {t('adminUserOAuthAuthorizations')}
        </Title>
        {(user.authorizations ?? []).length === 0 ? (
          <Text c="dimmed" size="sm">
            {t('adminUserNoAuthorizations')}
          </Text>
        ) : (
          <Table striped withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('adminOAuthClientName')}</Table.Th>
                <Table.Th>{t('adminUserAuthCreated')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(user.authorizations ?? []).map((a) => (
                <Table.Tr key={`${a.client_id}-${a.user_id}`}>
                  <Table.Td>{a.client?.name ?? `#${a.client_id}`}</Table.Td>
                  <Table.Td>
                    {new Date(a.created_at).toLocaleString(locale === 'zh-Hans' ? 'zh-CN' : 'en-US')}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {externalUserInfoEnabled ? (
        <Paper p="md" withBorder shadow="xs">
          <Title order={4} mb="sm">
            {t('adminUserExternalInfo')}
          </Title>
          <Button variant="light" mb="sm" onClick={loadExtInfo} loading={extInfoQ.isFetching}>
            {t('adminUserLoadExternalInfo')}
          </Button>
          {extInfoQ.data ? (
            <Stack gap="xs">
              {extInfoQ.data.map((row) => (
                <Paper key={row.id} p="sm" withBorder>
                  <Text fw={600}>
                    {row.name} ({row.type})
                  </Text>
                  {row.error ? (
                    <Text size="sm" c="red">
                      {row.error.msg} {row.error.detail}
                    </Text>
                  ) : (
                    <Text size="sm" component="pre" style={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(row.result, null, 2)}
                    </Text>
                  )}
                </Paper>
              ))}
            </Stack>
          ) : null}
        </Paper>
      ) : null}

      <Paper p="md" withBorder shadow="xs">
        <Title order={4} mb="sm" c="red">
          {t('adminUserDangerZone')}
        </Title>
        <Group>
          <Button color="orange" variant="light" onClick={openImpersonate}>
            {t('adminUserImpersonate')}
          </Button>
          <Button color="red" variant="light" onClick={openDelete}>
            {t('adminUserDelete')}
          </Button>
        </Group>
      </Paper>

      <Modal
        opened={resetConfirmOpened}
        onClose={closeResetConfirm}
        title={mailEnabled ? t('adminUserResetConfirmTitleMail') : t('adminUserResetConfirmTitle')}
      >
        <Text size="sm" mb="md">
          {mailEnabled
            ? t('adminUserResetConfirmBodyMail', { name: user.name })
            : t('adminUserResetConfirmBody', { name: user.name })}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeResetConfirm}>
            {t('back')}
          </Button>
          <Button loading={reconfirmM.isPending} onClick={() => reconfirmM.mutate()}>
            {mailEnabled ? t('adminUserReconfirmEmail') : t('adminUserResetConfirmUrl')}
          </Button>
        </Group>
      </Modal>

      <Modal opened={deleteOpened} onClose={closeDelete} title={t('adminUserDeleteConfirmTitle')}>
        <Text size="sm" mb="md">
          {t('adminUserDeleteConfirmBody', { name: user.name })}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeDelete}>
            {t('back')}
          </Button>
          <Button color="red" loading={deleteM.isPending} onClick={() => deleteM.mutate()}>
            {t('adminUserDelete')}
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={impersonateOpened}
        onClose={closeImpersonate}
        title={t('adminUserImpersonateConfirmTitle')}
      >
        <Text size="sm" mb="md">
          {t('adminUserImpersonateConfirmBody', { name: user.name })}
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={closeImpersonate}>
            {t('back')}
          </Button>
          <Button color="orange" loading={impersonateM.isPending} onClick={() => impersonateM.mutate()}>
            {t('adminUserImpersonate')}
          </Button>
        </Group>
      </Modal>
    </Stack>
  )
}
