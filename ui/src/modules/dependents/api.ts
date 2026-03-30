import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Dependent } from './types'

export async function fetchDependents(employeeId?: string): Promise<Dependent[]> {
  const qs = employeeId ? `?employee_id=${employeeId}` : ''
  const res = await authFetch(`${BASE}/dependents${qs}`)
  if (!res.ok) throw new Error('Failed to fetch dependents')
  return res.json()
}

export async function createDependent(body: unknown): Promise<Dependent> {
  const res = await jsonPost(`${BASE}/dependents`, body)
  if (!res.ok) throw new Error('Failed to create dependent')
  return res.json()
}

export async function updateDependent(id: string, body: unknown): Promise<Dependent> {
  const res = await jsonPut(`${BASE}/dependents/${id}`, body)
  if (!res.ok) throw new Error('Failed to update dependent')
  return res.json()
}

export async function deleteDependent(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/dependents/${id}`)
  if (!res.ok) throw new Error('Failed to delete dependent')
}
