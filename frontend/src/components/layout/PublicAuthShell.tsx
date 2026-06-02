import { Flex, Group, Paper, Stack, rem, type FlexProps, type StackProps } from '@mantine/core'

import { ThemeLocaleToolbar } from '@/components/layout/ThemeLocaleToolbar'
import { useLoginBackdropStyle } from '@/hooks/useLoginBackdropStyle'
import { isThemeLocaleToolbarVisible } from '@/models/uiConfig'

/** Full-viewport auth-style backdrop with theme/locale toolbar. Put body content in `children`. */
export function PublicAuthShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const shellStyle = useLoginBackdropStyle()
  return (
    <Flex direction="column" component="main" style={shellStyle}>
      {isThemeLocaleToolbarVisible ? (
        <Group justify="flex-end" px="md" pt="md" pb={0} wrap="nowrap" style={{ flexShrink: 0 }}>
          <ThemeLocaleToolbar />
        </Group>
      ) : null}
      {children}
    </Flex>
  )
}

type PublicAuthCenterProps = {
  children: React.ReactNode
  /** Default: column. Uses Mantine `Flex` props (avoid `ComponentProps<typeof Flex>` — polymorphic component). */
  direction?: FlexProps['direction']
  gap?: FlexProps['gap']
}

/** Centered body region below the toolbar (loading states, hero blocks without a card). */
export function PublicAuthCenter({
  children,
  direction = 'column',
  gap = 'md',
}: PublicAuthCenterProps): React.ReactElement {
  return (
    <Flex
      flex={1}
      align="center"
      justify="center"
      direction={direction}
      gap={gap}
      p="md"
      style={{ minHeight: 0 }}
    >
      {children}
    </Flex>
  )
}

type PublicAuthCardProps = {
  children: React.ReactNode
  /** Mantine `Stack` gap inside the paper */
  stackGap?: StackProps['gap']
  /** When true, outer flex allows vertical scroll (e.g. long login form). */
  scrollable?: boolean
}

/**
 * Standard centered card used on account login/register/request pages.
 * Page-specific UI goes in `children` (outlet).
 */
export function PublicAuthCard({
  children,
  stackGap = 'lg',
  scrollable = false,
}: PublicAuthCardProps): React.ReactElement {
  return (
    <Flex
      flex={1}
      align="center"
      justify="center"
      p="md"
      style={{ minHeight: 0, ...(scrollable ? { overflow: 'auto' } : {}) }}
    >
      <Paper shadow="xs" p="xl" radius="md" withBorder w="100%" maw={rem(400)} mx="auto">
        <Stack gap={stackGap}>{children}</Stack>
      </Paper>
    </Flex>
  )
}
