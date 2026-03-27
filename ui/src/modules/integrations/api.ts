import { BASE, authFetch, jsonPost } from '../shared/api'

// ── PayHero ─────────────────────────────────────────────────────────

export async function fetchPayHeroStatus(): Promise<{ configured: boolean; enabled: boolean }> {
  const res = await authFetch(`${BASE}/integrations/payhero/status`)
  if (!res.ok) throw new Error('Failed to fetch PayHero status')
  return res.json()
}

export async function testPayHeroConnection(): Promise<{ ok: boolean }> {
  const res = await jsonPost(`${BASE}/integrations/payhero/test`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Connection test failed' }))
    throw new Error(data.detail || 'Connection test failed')
  }
  return res.json()
}

export async function syncPayHero(): Promise<{ entries: Record<string, unknown>[]; total: number; to_create: number; to_update: number }> {
  const res = await jsonPost(`${BASE}/integrations/payhero/sync`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Sync failed' }))
    throw new Error(data.detail || 'Sync failed')
  }
  return res.json()
}

export async function importPayHero(): Promise<{ status: string; results: Record<string, number> }> {
  const res = await jsonPost(`${BASE}/integrations/payhero/import`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Import failed' }))
    throw new Error(data.detail || 'Import failed')
  }
  return res.json()
}

// ── Azure AD ────────────────────────────────────────────────────────

export async function fetchAzureADStatus(): Promise<{ connected: boolean; enabled: boolean; has_credentials: boolean; tenant_id: string }> {
  const res = await authFetch(`${BASE}/integrations/azure-ad/status`)
  if (!res.ok) throw new Error('Failed to fetch Azure AD status')
  return res.json()
}

export async function disconnectAzureAD(): Promise<{ status: string }> {
  const res = await jsonPost(`${BASE}/integrations/azure-ad/disconnect`, {})
  if (!res.ok) throw new Error('Failed to disconnect Azure AD')
  return res.json()
}

export async function syncAzureAD(): Promise<{ entries: Record<string, unknown>[]; total: number; to_create: number; to_update: number }> {
  const res = await jsonPost(`${BASE}/integrations/azure-ad/sync`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Sync failed' }))
    throw new Error(data.detail || 'Sync failed')
  }
  return res.json()
}

export async function importAzureAD(): Promise<{ status: string; results: Record<string, Record<string, number>> }> {
  const res = await jsonPost(`${BASE}/integrations/azure-ad/import`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Import failed' }))
    throw new Error(data.detail || 'Import failed')
  }
  return res.json()
}

export async function pushToAzureAD(employeeId: string): Promise<{ status: string; azure_ad_id: string }> {
  const res = await jsonPost(`${BASE}/integrations/azure-ad/push`, { employee_id: employeeId })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Push failed' }))
    throw new Error(data.detail || 'Push failed')
  }
  return res.json()
}

// ── Microsoft SSO ───────────────────────────────────────────────────

export async function microsoftSSOLogin(idToken: string): Promise<{ jwt: string }> {
  const res = await fetch(`${BASE}/auth/microsoft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'SSO login failed' }))
    throw new Error(data.detail || 'SSO login failed')
  }
  return res.json()
}
