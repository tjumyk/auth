/** Hostnames treated as local/dev — HTTP here does not trigger the insecure-connection warning. */
export function isLocalDevHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase()
  if (!host) {
    return false
  }
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return true
  }
  if (host === '::1' || host === '[::1]') {
    return true
  }

  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!match) {
    return false
  }

  const octets = match.slice(1, 5).map((part) => Number.parseInt(part, 10))
  if (octets.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false
  }

  const [a, b] = octets
  if (a === 127) {
    return true
  }
  if (a === 10) {
    return true
  }
  if (a === 192 && b === 168) {
    return true
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true
  }
  if (host === '0.0.0.0') {
    return true
  }

  return false
}

/** True when the SPA is loaded over plain HTTP in the browser. */
export function isHttpHostedPage(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'http:'
}

/**
 * True when admins should see the insecure HTTP banner: HTTP on a non-local host.
 * Local/dev hosts (localhost, loopback, private LAN) pass without warning.
 */
export function shouldWarnAdminInsecureHttp(): boolean {
  if (typeof window === 'undefined' || window.location.protocol !== 'http:') {
    return false
  }
  return !isLocalDevHost(window.location.hostname)
}
