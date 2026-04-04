import {
  alpha,
  AppShell,
  Avatar,
  Box,
  Divider,
  Group,
  Menu,
  Text,
  UnstyledButton,
  useComputedColorScheme,
  useMantineTheme,
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconChevronDown, IconLogout, IconUser } from '@tabler/icons-react'
import { type CSSProperties, useMemo } from 'react'
import { Link, Outlet } from 'react-router'

import { SiteLogoImage } from '@/components/branding/SiteLogoImage'
import { ThemeLocaleToolbar } from '@/components/layout/ThemeLocaleToolbar'
import { useAuthUser } from '@/hooks/useAuthUser'
import { useI18n } from '@/hooks/useI18n'
import { siteConfig } from '@/models/siteConfig'

function useAppShellBackdropStyles(): {
  root: CSSProperties
  main: CSSProperties
  header: CSSProperties
  footer: CSSProperties
} {
  const theme = useMantineTheme()
  const colorScheme = useComputedColorScheme('light')

  return useMemo(() => {
    const { brand } = theme.colors
    const isDark = colorScheme === 'dark'

    const root: CSSProperties = isDark
      ? {
          minHeight: '100dvh',
          backgroundColor: theme.colors.dark[8],
          backgroundImage: `
            radial-gradient(ellipse 85% 55% at 50% -18%, ${alpha(brand[5], 0.28)} 0%, transparent 58%),
            radial-gradient(ellipse 65% 50% at 102% 58%, ${alpha(brand[7], 0.22)} 0%, transparent 52%),
            radial-gradient(ellipse 55% 42% at -8% 88%, ${alpha(brand[9], 0.14)} 0%, transparent 46%),
            linear-gradient(185deg, ${theme.colors.dark[7]} 0%, ${theme.colors.dark[8]} 42%, ${theme.colors.dark[9]} 100%)
          `,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }
      : {
          minHeight: '100dvh',
          backgroundColor: theme.colors.gray[0],
          backgroundImage: `
            radial-gradient(ellipse 95% 58% at 48% -12%, ${alpha(brand[3], 0.38)} 0%, transparent 56%),
            radial-gradient(ellipse 72% 52% at 100% 72%, ${alpha(brand[1], 0.42)} 0%, transparent 54%),
            radial-gradient(ellipse 58% 48% at -6% 90%, ${alpha(brand[0], 0.9)} 0%, transparent 50%),
            linear-gradient(185deg, ${theme.colors.gray[0]} 0%, ${alpha(brand[0], 0.5)} 45%, ${theme.colors.gray[1]} 100%)
          `,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }

    const glass: CSSProperties = isDark
      ? {
          backgroundColor: alpha(theme.colors.dark[8], 0.62),
          backdropFilter: 'saturate(180%) blur(14px)',
        }
      : {
          backgroundColor: alpha('#fff', 0.58),
          backdropFilter: 'saturate(180%) blur(14px)',
        }

    const hairline = isDark ? alpha(theme.white, 0.07) : alpha(theme.black, 0.06)

    return {
      root,
      main: { background: 'transparent' },
      header: {
        ...glass,
        borderBottom: `1px solid ${hairline}`,
      },
      footer: {
        ...glass,
        borderTop: `1px solid ${hairline}`,
      },
    }
  }, [colorScheme, theme])
}

export function AppShellLayout(): React.ReactElement {
  const { t } = useI18n()
  const user = useAuthUser()
  const shellStyles = useAppShellBackdropStyles()
  /** Focus trap + returnFocus scroll the viewport on many mobile browsers; glass header + absolute float also jitters. */
  const isNarrowViewport = useMediaQuery('(max-width: 48em)', false, {
    getInitialValueInEffect: true,
  })

  return (
    <AppShell
      header={{ height: 56 }}
      padding="md"
      styles={{
        root: shellStyles.root,
        main: shellStyles.main,
        header: shellStyles.header,
        footer: shellStyles.footer,
      }}
    >
      <AppShell.Header px="md" py="xs">
        <Group h="100%" justify="space-between" wrap="nowrap" align="center">
          <Box
            component={Link}
            to="/"
            aria-label={t('goHome')}
            style={{ minWidth: 0, textDecoration: 'none', color: 'inherit' }}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <SiteLogoImage placement="header" />
              <Text fw={600} style={{ minWidth: 0 }} lineClamp={1}>
                {siteConfig.name}
              </Text>
            </Group>
          </Box>
          <Group gap="xs" wrap="nowrap" align="center" justify="flex-end" style={{ flexShrink: 0 }}>
            <ThemeLocaleToolbar />
            <Divider
              orientation="vertical"
              h={24}
              style={{ alignSelf: 'center' }}
            />
            <Menu
              shadow="md"
              width={220}
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
                    <Avatar src={user.avatar ?? undefined} radius="md" size="sm" color="brand">
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
                <Menu.Item component={Link} to="/account/profile" leftSection={<IconUser size={16} />}>
                  {t('profileNav')}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  component={Link}
                  to="/account/logout"
                  color="red"
                  leftSection={<IconLogout size={16} />}
                >
                  {t('signOut')}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
      <AppShell.Footer>
        <Box ta="center">
          <Text size="sm" c="dimmed">
            {siteConfig.copyright}
          </Text>
        </Box>
      </AppShell.Footer>
    </AppShell>
  )
}
