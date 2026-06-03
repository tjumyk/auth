import {
  AppShell,
  Box,
  Burger,
  Group,
  Stack,
  Text,
  NavLink as MantineNavLink,
} from '@mantine/core'
import { useDisclosure, useDocumentTitle } from '@mantine/hooks'
import {
  IconHome,
  IconInfoCircle,
  IconMail,
  IconUsers,
  IconUsersGroup,
  IconWindow,
} from '@tabler/icons-react'
import { type ReactNode, useMemo } from 'react'
import { NavLink, Outlet } from 'react-router'

import { ShellHeaderAccountMenu } from '@/components/layout/ShellHeaderAccountMenu'
import { ShellHeaderBrand } from '@/components/layout/ShellHeaderBrand'
import { useAppShellBackdropStyles } from '@/components/layout/useAppShellBackdropStyles'
import { useI18n } from '@/hooks/useI18n'
import { mailEnabled } from '@/models/mailConfig'
import { siteConfig } from '@/models/siteConfig'

function AdminSidebarLink({
  to,
  end,
  label,
  leftSection,
  onClick,
}: {
  to: string
  end?: boolean
  label: string
  leftSection: ReactNode
  onClick?: () => void
}): React.ReactElement {
  return (
    <MantineNavLink
      component={NavLink}
      to={to}
      end={end}
      onClick={onClick}
      label={label}
      leftSection={leftSection}
    />
  )
}

function NavSectionLabel({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <Text size="xs" tt="uppercase" fw={600} c="dimmed" mt="sm" mb={4} px={10}>
      {children}
    </Text>
  )
}

export function AdminLayout(): React.ReactElement {
  const { t } = useI18n()
  const shellStyles = useAppShellBackdropStyles()
  const [mobileOpened, { toggle, close }] = useDisclosure()

  useDocumentTitle(`${siteConfig.name} · ${t('adminLayoutTitle')}`)

  const closeMobile = (): void => {
    close()
  }

  const adminHeaderSubline = useMemo(() => {
    const parts = [siteConfig.organizationName.trim(), siteConfig.groupName.trim()].filter(Boolean)
    const admin = t('adminLayoutTitle')
    return parts.length ? `${parts.join(' · ')} · ${admin}` : admin
  }, [t])

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
      styles={{
        root: shellStyles.root,
        main: shellStyles.main,
        header: shellStyles.header,
        footer: shellStyles.footer,
        navbar: shellStyles.navbar,
      }}
    >
      <AppShell.Header px="md" py="xs">
        <Group h="100%" justify="space-between" wrap="nowrap" align="center">
          <ShellHeaderBrand
            before={<Burger opened={mobileOpened} onClick={toggle} hiddenFrom="sm" size="sm" />}
            subline={adminHeaderSubline}
            onNavigate={closeMobile}
          />
          <ShellHeaderAccountMenu onAfterNavigate={closeMobile} />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          <Stack gap={2}>
            <AdminSidebarLink
              to="/"
              end
              label={t('goHome')}
              leftSection={<IconHome size={18} stroke={1.5} />}
              onClick={closeMobile}
            />
            <NavSectionLabel>{t('adminNavAccount')}</NavSectionLabel>
            <AdminSidebarLink
              to="/admin/account/users"
              end
              label={t('adminNavUsers')}
              leftSection={<IconUsers size={18} stroke={1.5} />}
              onClick={closeMobile}
            />
            <AdminSidebarLink
              to="/admin/account/groups"
              end
              label={t('adminNavGroups')}
              leftSection={<IconUsersGroup size={18} stroke={1.5} />}
              onClick={closeMobile}
            />
            <NavSectionLabel>{t('adminNavOAuth')}</NavSectionLabel>
            <AdminSidebarLink
              to="/admin/oauth/clients"
              end
              label={t('adminNavClients')}
              leftSection={<IconWindow size={18} stroke={1.5} />}
              onClick={closeMobile}
            />
            {mailEnabled ? (
              <>
                <NavSectionLabel>{t('adminNavEmail')}</NavSectionLabel>
                <AdminSidebarLink
                  to="/admin/email/send"
                  end
                  label={t('adminNavSendEmail')}
                  leftSection={<IconMail size={18} stroke={1.5} />}
                  onClick={closeMobile}
                />
              </>
            ) : null}
            <AdminSidebarLink
              to="/admin/about"
              end
              label={t('adminNavAbout')}
              leftSection={<IconInfoCircle size={18} stroke={1.5} />}
              onClick={closeMobile}
            />
          </Stack>
        </AppShell.Section>
      </AppShell.Navbar>

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
