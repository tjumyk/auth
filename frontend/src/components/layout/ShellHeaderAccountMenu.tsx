import { Avatar, Box, Divider, Group, Menu, Text, UnstyledButton } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconChevronDown, IconLogout, IconUser } from '@tabler/icons-react'
import { Link } from 'react-router'

import { ThemeLocaleToolbar } from '@/components/layout/ThemeLocaleToolbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useI18n } from '@/hooks/useI18n'
import { isLocaleForced, isThemeForced, isThemeLocaleToolbarVisible } from '@/models/uiConfig'
import { userAvatarSrc } from '@/utils/siteAssetUrl'

export function ShellHeaderAccountMenu({
  onAfterNavigate,
}: {
  onAfterNavigate?: () => void
}): React.ReactElement {
  const { t } = useI18n()
  const user = useAuthUser()
  const isNarrowViewport = useMediaQuery('(max-width: 48em)', false, {
    getInitialValueInEffect: true,
  })

  return (
    <Group gap="xs" wrap="nowrap" align="center" justify="flex-end" style={{ flexShrink: 0 }}>
      {isThemeLocaleToolbarVisible ? (
        <Group gap="xs" wrap="nowrap" align="center" visibleFrom="sm">
          <ThemeLocaleToolbar />
          <Divider orientation="vertical" h={24} style={{ alignSelf: 'center' }} />
        </Group>
      ) : null}
      <Menu
        shadow="md"
        width={260}
        position="bottom-end"
        withinPortal
        floatingStrategy="fixed"
        trapFocus={!isNarrowViewport}
        returnFocus={!isNarrowViewport}
        transitionProps={isNarrowViewport ? { duration: 0 } : undefined}
      >
        <Menu.Target>
          <UnstyledButton
            aria-label={`${user.name}. ${t('accountMenu')}`}
            style={{
              borderRadius: 'var(--mantine-radius-md)',
              padding: '2px 6px 2px 2px',
            }}
          >
            <Group gap={6} wrap="nowrap">
              <Avatar src={userAvatarSrc(user)} radius="md" size="sm" color="brand">
                {(user.name.trim().slice(0, 1) || '?').toUpperCase()}
              </Avatar>
              <Box visibleFrom="sm" maw={160} style={{ minWidth: 0 }}>
                <Text size="sm" fw={500} lineClamp={1}>
                  {user.name}
                </Text>
              </Box>
              <Box visibleFrom="sm" style={{ display: 'flex', alignItems: 'center' }}>
                <IconChevronDown size={14} stroke={1.5} opacity={0.55} />
              </Box>
            </Group>
          </UnstyledButton>
        </Menu.Target>
        <Menu.Dropdown>
          <Box hiddenFrom="sm">
            {isThemeLocaleToolbarVisible ? (
              <>
                <Menu.Label>
                  {t(
                    isThemeForced && !isLocaleForced
                      ? 'language'
                      : isLocaleForced && !isThemeForced
                        ? 'theme'
                        : 'appearanceAndLanguage',
                  )}
                </Menu.Label>
                <Box px={6} py={6}>
                  <ThemeLocaleToolbar variant="menu" />
                </Box>
                <Menu.Divider />
              </>
            ) : null}
          </Box>
          <Menu.Item
            component={Link}
            to="/account/profile"
            leftSection={<IconUser size={16} />}
            onClick={onAfterNavigate}
          >
            {t('profileNav')}
          </Menu.Item>
          <Menu.Divider />
          <Menu.Item
            component={Link}
            to="/account/logout"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={onAfterNavigate}
          >
            {t('signOut')}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  )
}
