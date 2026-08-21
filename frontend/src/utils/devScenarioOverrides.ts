import type { IpCheckResult } from '@/utils/enrichOAuthClientsWithIpCheck'

/**
 * Dev-only override for manual QA without a real firewall block.
 */
export function applyDevIpCheckOverride(ipCheck: IpCheckResult | null): IpCheckResult | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') {
    return ipCheck
  }
  const params = new URLSearchParams(window.location.search)
  if (params.get('dev_ip_blocked') !== '1') {
    return ipCheck
  }
  return {
    check_pass: false,
    guarded_ports: ipCheck?.guarded_ports?.length ? ipCheck.guarded_ports : [443, 80],
  }
}
