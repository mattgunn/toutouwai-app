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

// ── Slack ──────────────────────────────────────────────────────────

export async function fetchSlackStatus(): Promise<{ configured: boolean; enabled: boolean; workspace: string }> {
  const res = await authFetch(`${BASE}/integrations/slack/status`)
  if (!res.ok) throw new Error('Failed to fetch Slack status')
  return res.json()
}

export async function testSlackConnection(): Promise<{ ok: boolean }> {
  const res = await jsonPost(`${BASE}/integrations/slack/test`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Connection test failed' }))
    throw new Error(data.detail || 'Connection test failed')
  }
  return res.json()
}

export async function sendSlackNotification(): Promise<{ sent: boolean; channel: string }> {
  const res = await jsonPost(`${BASE}/integrations/slack/notify`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Send notification failed' }))
    throw new Error(data.detail || 'Send notification failed')
  }
  return res.json()
}

// ── Microsoft Teams ────────────────────────────────────────────────

export async function fetchTeamsStatus(): Promise<{ configured: boolean; enabled: boolean }> {
  const res = await authFetch(`${BASE}/integrations/teams/status`)
  if (!res.ok) throw new Error('Failed to fetch Teams status')
  return res.json()
}

export async function testTeamsConnection(): Promise<{ ok: boolean }> {
  const res = await jsonPost(`${BASE}/integrations/teams/test`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Connection test failed' }))
    throw new Error(data.detail || 'Connection test failed')
  }
  return res.json()
}

export async function sendTeamsNotification(): Promise<{ sent: boolean }> {
  const res = await jsonPost(`${BASE}/integrations/teams/notify`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Send notification failed' }))
    throw new Error(data.detail || 'Send notification failed')
  }
  return res.json()
}

// ── Xero ──────────────────────────────────────────────────────────

export async function fetchXeroStatus(): Promise<{ configured: boolean; enabled: boolean; org_name: string }> {
  const res = await authFetch(`${BASE}/integrations/xero/status`)
  if (!res.ok) throw new Error('Failed to fetch Xero status')
  return res.json()
}

export async function testXeroConnection(): Promise<{ ok: boolean; org_name: string }> {
  const res = await jsonPost(`${BASE}/integrations/xero/test`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Connection test failed' }))
    throw new Error(data.detail || 'Connection test failed')
  }
  return res.json()
}

export async function syncXero(): Promise<{ journals: number; total_amount: number; period: string }> {
  const res = await jsonPost(`${BASE}/integrations/xero/sync`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Sync failed' }))
    throw new Error(data.detail || 'Sync failed')
  }
  return res.json()
}

export async function pushToXero(): Promise<{ pushed: number; message: string }> {
  const res = await jsonPost(`${BASE}/integrations/xero/push`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Push failed' }))
    throw new Error(data.detail || 'Push failed')
  }
  return res.json()
}

// ── Deputy ────────────────────────────────────────────────────────

export async function fetchDeputyStatus(): Promise<{ configured: boolean; enabled: boolean }> {
  const res = await authFetch(`${BASE}/integrations/deputy/status`)
  if (!res.ok) throw new Error('Failed to fetch Deputy status')
  return res.json()
}

export async function testDeputyConnection(): Promise<{ ok: boolean }> {
  const res = await jsonPost(`${BASE}/integrations/deputy/test`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Connection test failed' }))
    throw new Error(data.detail || 'Connection test failed')
  }
  return res.json()
}

export async function syncDeputy(): Promise<{ total: number; to_import: number; period: string }> {
  const res = await jsonPost(`${BASE}/integrations/deputy/sync`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Sync failed' }))
    throw new Error(data.detail || 'Sync failed')
  }
  return res.json()
}

export async function importDeputy(): Promise<{ imported: number; skipped: number }> {
  const res = await jsonPost(`${BASE}/integrations/deputy/import`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Import failed' }))
    throw new Error(data.detail || 'Import failed')
  }
  return res.json()
}

// ── SmartRecruiters ─────────────────────────────────────────────────

export async function fetchSmartRecruitersStatus(): Promise<{ configured: boolean; enabled: boolean; company: string }> {
  const res = await authFetch(`${BASE}/integrations/smartrecruiters/status`)
  if (!res.ok) throw new Error('Failed to fetch SmartRecruiters status')
  return res.json()
}

export async function testSmartRecruitersConnection(): Promise<{ ok: boolean }> {
  const res = await jsonPost(`${BASE}/integrations/smartrecruiters/test`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Connection test failed' }))
    throw new Error(data.detail || 'Connection test failed')
  }
  return res.json()
}

export async function syncSmartRecruiters(): Promise<{ jobs: number; applicants: number; to_import: number }> {
  const res = await jsonPost(`${BASE}/integrations/smartrecruiters/sync`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Sync failed' }))
    throw new Error(data.detail || 'Sync failed')
  }
  return res.json()
}

export async function importSmartRecruiters(): Promise<{ imported: number; skipped: number; errors: number }> {
  const res = await jsonPost(`${BASE}/integrations/smartrecruiters/import`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Import failed' }))
    throw new Error(data.detail || 'Import failed')
  }
  return res.json()
}

export async function pushSmartRecruiters(): Promise<{ posted: number; updated: number }> {
  const res = await jsonPost(`${BASE}/integrations/smartrecruiters/push`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Push failed' }))
    throw new Error(data.detail || 'Push failed')
  }
  return res.json()
}

// ── Employment Hero ─────────────────────────────────────────────────

export async function fetchEmploymentHeroStatus(): Promise<{ configured: boolean; enabled: boolean; org: string }> {
  const res = await authFetch(`${BASE}/integrations/employment-hero/status`)
  if (!res.ok) throw new Error('Failed to fetch Employment Hero status')
  return res.json()
}

export async function testEmploymentHeroConnection(): Promise<{ ok: boolean }> {
  const res = await jsonPost(`${BASE}/integrations/employment-hero/test`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Connection test failed' }))
    throw new Error(data.detail || 'Connection test failed')
  }
  return res.json()
}

export async function syncEmploymentHero(): Promise<{ employees: number; documents: number; to_import: number }> {
  const res = await jsonPost(`${BASE}/integrations/employment-hero/sync`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Sync failed' }))
    throw new Error(data.detail || 'Sync failed')
  }
  return res.json()
}

export async function importEmploymentHero(): Promise<{ imported: number; documents: number; skipped: number }> {
  const res = await jsonPost(`${BASE}/integrations/employment-hero/import`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Import failed' }))
    throw new Error(data.detail || 'Import failed')
  }
  return res.json()
}

export async function pushEmploymentHero(): Promise<{ pushed: number; agreements: number }> {
  const res = await jsonPost(`${BASE}/integrations/employment-hero/push`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Push failed' }))
    throw new Error(data.detail || 'Push failed')
  }
  return res.json()
}

// ── Google Workspace ───────────────────────────────────────────────

export async function fetchGoogleStatus(): Promise<{ configured: boolean; enabled: boolean; domain: string }> {
  const res = await authFetch(`${BASE}/integrations/google/status`)
  if (!res.ok) throw new Error('Failed to fetch Google Workspace status')
  return res.json()
}

export async function testGoogleConnection(): Promise<{ ok: boolean }> {
  const res = await jsonPost(`${BASE}/integrations/google/test`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Connection test failed' }))
    throw new Error(data.detail || 'Connection test failed')
  }
  return res.json()
}

export async function syncGoogle(): Promise<{ total: number; to_create: number; to_update: number }> {
  const res = await jsonPost(`${BASE}/integrations/google/sync`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Sync failed' }))
    throw new Error(data.detail || 'Sync failed')
  }
  return res.json()
}

export async function importGoogle(): Promise<{ status: string; results: Record<string, number> }> {
  const res = await jsonPost(`${BASE}/integrations/google/import`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Import failed' }))
    throw new Error(data.detail || 'Import failed')
  }
  return res.json()
}

export async function pushGoogle(): Promise<{ status: string; provisioned: number; suspended: number }> {
  const res = await jsonPost(`${BASE}/integrations/google/push`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Push failed' }))
    throw new Error(data.detail || 'Push failed')
  }
  return res.json()
}

// ── Okta ──────────────────────────────────────────────────────────

export async function fetchOktaStatus(): Promise<{ configured: boolean; enabled: boolean; org_url: string }> {
  const res = await authFetch(`${BASE}/integrations/okta/status`)
  if (!res.ok) throw new Error('Failed to fetch Okta status')
  return res.json()
}

export async function testOktaConnection(): Promise<{ ok: boolean }> {
  const res = await jsonPost(`${BASE}/integrations/okta/test`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Connection test failed' }))
    throw new Error(data.detail || 'Connection test failed')
  }
  return res.json()
}

export async function syncOkta(): Promise<{ total: number; to_create: number; to_update: number }> {
  const res = await jsonPost(`${BASE}/integrations/okta/sync`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Sync failed' }))
    throw new Error(data.detail || 'Sync failed')
  }
  return res.json()
}

export async function importOkta(): Promise<{ status: string; results: Record<string, number> }> {
  const res = await jsonPost(`${BASE}/integrations/okta/import`, {})
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Import failed' }))
    throw new Error(data.detail || 'Import failed')
  }
  return res.json()
}

export async function pushOkta(): Promise<{ status: string; provisioned: number; deactivated: number }> {
  const res = await jsonPost(`${BASE}/integrations/okta/push`, {})
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
