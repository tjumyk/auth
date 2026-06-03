import axios, { type AxiosInstance, isAxiosError } from 'axios'

import { parseBasicErrorFromUnknown, type BasicError } from '@/models/apiError'
import { withAppBasePath } from '@/utils/appBasePath'

export type AxiosErrorWithBasic = Error & {
  basicError?: BasicError
}

const _maxDevApiDelayMs = 60_000

function getDevApiDelayMs(): number {
  if (!import.meta.env.DEV) {
    return 0
  }
  const raw = import.meta.env.VITE_DEV_API_DELAY_MS
  if (raw === undefined || raw === '') {
    return 0
  }
  const n = Number.parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 0) {
    return 0
  }
  return Math.min(n, _maxDevApiDelayMs)
}

const devApiDelayMs = getDevApiDelayMs()

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function maybeDevDelay(): Promise<void> {
  if (devApiDelayMs > 0) {
    await sleep(devApiDelayMs)
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  if (config.url) {
    config.url = withAppBasePath(config.url)
  }
  return config
})

apiClient.interceptors.response.use(
  async (response) => {
    await maybeDevDelay()
    return response
  },
  async (error: unknown) => {
    await maybeDevDelay()
    if (isAxiosError(error) && error.response?.data !== undefined) {
      const parsed = parseBasicErrorFromUnknown(error.response.data)
      if (parsed) {
        ;(error as AxiosErrorWithBasic).basicError = parsed
      }
    }
    return Promise.reject(error)
  },
)

export function getBasicErrorFromUnknown(err: unknown): BasicError | null {
  if (isAxiosError(err) && (err as AxiosErrorWithBasic).basicError) {
    return (err as AxiosErrorWithBasic).basicError ?? null
  }
  if (isAxiosError(err) && err.response?.data !== undefined) {
    return parseBasicErrorFromUnknown(err.response.data)
  }
  return null
}
