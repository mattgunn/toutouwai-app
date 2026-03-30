import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { LeaveAccrualPolicy } from './types'

export async function fetchAccrualPolicies(): Promise<LeaveAccrualPolicy[]> {
  const res = await authFetch(`${BASE}/leave/accrual-policies`)
  if (!res.ok) throw new Error('Failed to fetch accrual policies')
  return res.json()
}

export async function createAccrualPolicy(body: unknown): Promise<LeaveAccrualPolicy> {
  const res = await jsonPost(`${BASE}/leave/accrual-policies`, body)
  if (!res.ok) throw new Error('Failed to create accrual policy')
  return res.json()
}

export async function updateAccrualPolicy(id: string, body: unknown): Promise<LeaveAccrualPolicy> {
  const res = await jsonPut(`${BASE}/leave/accrual-policies/${id}`, body)
  if (!res.ok) throw new Error('Failed to update accrual policy')
  return res.json()
}

export async function deleteAccrualPolicy(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/leave/accrual-policies/${id}`)
  if (!res.ok) throw new Error('Failed to delete accrual policy')
}
