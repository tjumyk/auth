import type { OAuthClient } from '@/models/oauthClient'

export type IpCheckResult = {
  check_pass: boolean
  guarded_ports: number[]
}

/**
 * Mirrors Angular `HomeComponent` logic: mark clients whose `home_url` port is in `guarded_ports`.
 */
export function enrichOAuthClientsWithIpCheck(
  clients: OAuthClient[],
  ipCheck: IpCheckResult | null,
): OAuthClient[] {
  if (!ipCheck || ipCheck.check_pass || !ipCheck.guarded_ports.length) {
    return clients.map((c) => ({ ...c, _is_ip_blocked: false }))
  }

  const guarded = new Set(ipCheck.guarded_ports)

  return clients.map((client) => {
    let blocked = false
    try {
      const urlObj = new URL(client.home_url)
      let port = urlObj.port
      if (!port) {
        if (urlObj.protocol === 'http:') {
          port = '80'
        } else if (urlObj.protocol === 'https:') {
          port = '443'
        }
      }
      if (port) {
        const portNum = parseInt(port, 10)
        if (!Number.isNaN(portNum)) {
          blocked = guarded.has(portNum)
        }
      }
    } catch {
      blocked = false
    }
    return { ...client, _is_ip_blocked: blocked }
  })
}

export function findGateClient(clients: OAuthClient[]): OAuthClient | undefined {
  return clients.find((c) => c.name === 'gate')
}
