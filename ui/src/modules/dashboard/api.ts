import { BASE, authFetch } from '../shared/api'
import type { DashboardData } from './types'

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await authFetch(`${BASE}/dashboard`)
  if (!res.ok) throw new Error('Failed to fetch dashboard')
  return res.json()
}
