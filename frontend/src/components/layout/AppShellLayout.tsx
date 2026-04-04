import { AppShell, Box, Group, Text } from '@mantine/core'
import { useMemo } from 'react'
import { Outlet } from 'react-router'

import { ShellHeaderAccountMenu } from '@/components/layout/ShellHeaderAccountMenu'
import { ShellHeaderBrand } from '@/components/layout/ShellHeaderBrand'
import { useAppShellBackdropStyles } from '@/components/layout/useAppShellBackdropStyles'
import { siteConfig } from '@/models/siteConfig'

export function AppShellLayout(): React.ReactElement {
  const shellStyles = useAppShellBackdropStyles()

  const headerSubline = useMemo(() => {
    const parts = [siteConfig.organizationName.trim(), siteConfig.groupName.trim()].filter(Boolean)
    return parts.length ? parts.join(' · ') : ''
  }, [])

  return (
    <AppShell
      header={{ height: headerSubline ? 64 : 56 }}
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
          <ShellHeaderBrand subline={headerSubline || undefined} />
          <ShellHeaderAccountMenu />
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
