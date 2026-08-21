/**
 * Build gate /grant-access URL for an OAuth client intent.
 */
export function buildGateGrantAccessUrl(gateHomeUrl: string, intentClientId: number): string {
  const base = new URL(gateHomeUrl)
  base.search = ''
  base.hash = ''
  const grantUrl = new URL('grant-access', base)
  grantUrl.searchParams.set('intent_client_id', String(intentClientId))
  return grantUrl.toString()
}
