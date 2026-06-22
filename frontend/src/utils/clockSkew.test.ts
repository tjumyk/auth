import { describe, expect, it } from 'vitest'

import {
  CLOCK_SKEW_WARNING_THRESHOLD_SECONDS,
  estimateClockSkewSeconds,
  formatClockSkewSeconds,
  isClockSkewWarning,
} from '@/utils/clockSkew'

describe('clockSkew', () => {
  it('detects skew above threshold', () => {
    expect(isClockSkewWarning(CLOCK_SKEW_WARNING_THRESHOLD_SECONDS)).toBe(true)
    expect(isClockSkewWarning(-45)).toBe(true)
    expect(isClockSkewWarning(29)).toBe(false)
  })

  it('estimates skew from server time and browser midpoint', () => {
    expect(estimateClockSkewSeconds(1_000, 1_045_000)).toBe(-45)
    expect(estimateClockSkewSeconds(1_000, 955_000)).toBe(45)
  })

  it('formats absolute skew seconds', () => {
    expect(formatClockSkewSeconds(-45.4)).toBe(45)
  })
})
