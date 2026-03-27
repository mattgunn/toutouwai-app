import { BASE, authFetch } from '../shared/api'
import type { AuditResponse } from './types'

export async function fetchAuditLog(params?: Record<string, string>): Promise<AuditResponse> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/audit${qs}`)
  if (!res.ok) throw new Error('Failed to fetch audit log')
  return res.json()
}
