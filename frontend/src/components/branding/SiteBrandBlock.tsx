import { Stack, Text, Title } from '@mantine/core'

import { SiteLogoImage } from '@/components/branding/SiteLogoImage'
import { siteConfig } from '@/models/siteConfig'

/** Large login-style site logo, name, and optional org / group lines from `siteConfig`. */
export function SiteBrandBlock(): React.ReactElement {
  return (
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
}
