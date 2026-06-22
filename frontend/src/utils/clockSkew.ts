/** Warn when browser and server clocks differ by at least one TOTP step. */
export const CLOCK_SKEW_WARNING_THRESHOLD_SECONDS = 30

export function isClockSkewWarning(skewSeconds: number): boolean {
  return Math.abs(skewSeconds) >= CLOCK_SKEW_WARNING_THRESHOLD_SECONDS
}

export function formatClockSkewSeconds(skewSeconds: number): number {
  return Math.round(Math.abs(skewSeconds))
}

/** Positive skew means the server clock is ahead of the browser. */
export function estimateClockSkewSeconds(serverUnixTime: number, browserMidpointMs: number): number {
  return serverUnixTime - browserMidpointMs / 1000
}
