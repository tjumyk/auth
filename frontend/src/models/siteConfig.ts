import { z } from 'zod'

import rawConfig from '../../../config.json'

const SiteSchema = z
  .object({
    name: z.string().optional(),
    organization_name: z.string().optional(),
    group_name: z.string().optional(),
    copyright: z.string().optional(),
  })
  .passthrough()

const RootConfigSchema = z
  .object({
    SITE: SiteSchema.optional(),
  })
  .passthrough()

const rootParsed = RootConfigSchema.safeParse(rawConfig)
const site = rootParsed.success ? rootParsed.data.SITE : undefined

export const siteConfig = {
  name: site?.name ?? 'Identity',
  organizationName: site?.organization_name ?? '',
  groupName: site?.group_name ?? '',
  copyright: site?.copyright ?? '',
}
