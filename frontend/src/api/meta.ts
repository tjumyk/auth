import { z } from 'zod'

import { apiClient } from '@/api/client'
import { estimateClockSkewSeconds } from '@/utils/clockSkew'

const MetaVersionSchema = z.object({
  commit: z.string(),
})

const MetaTimeSchema = z.object({
  unix_time: z.number(),
})

export const META_TIME_QUERY_KEY = ['meta', 'time'] as const

export type MetaTimeResult = {
  unix_time: number
  skewSeconds: number
}

export async function fetchMetaVersion(): Promise<{ commit: string }> {
  const res = await apiClient.get<unknown>('/api/meta/version')
  const parsed = MetaVersionSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('meta version parse error', parsed.error.flatten())
    throw new Error('Invalid version payload from server')
  }
  return parsed.data
}

export async function fetchMetaTime(): Promise<MetaTimeResult> {
  const startedAtMs = Date.now()
  const res = await apiClient.get<unknown>('/api/meta/time')
  const finishedAtMs = Date.now()
  const parsed = MetaTimeSchema.safeParse(res.data)
  if (!parsed.success) {
    console.error('meta time parse error', parsed.error.flatten())
    throw new Error('Invalid time payload from server')
  }
  const browserMidpointMs = (startedAtMs + finishedAtMs) / 2
  return {
    unix_time: parsed.data.unix_time,
    skewSeconds: estimateClockSkewSeconds(parsed.data.unix_time, browserMidpointMs),
  }
}
