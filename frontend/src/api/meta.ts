import { z } from 'zod'

import { apiClient } from '@/api/client'

const MetaVersionSchema = z.object({
  commit: z.string(),
})

export async function fetchMetaVersion(): Promise<{ commit: string }> {
  const res = await apiClient.get<unknown>('/api/meta/version')
  const parsed = MetaVersionSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('meta version parse error', parsed.error.flatten())
    throw new Error('Invalid version payload from server')
  }
  return parsed.data
}
