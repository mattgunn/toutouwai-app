import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Grievance } from './types'

export async function fetchGrievances(params?: { employee_id?: string; status?: string; priority?: string }): Promise<Grievance[]> {
  const query = new URLSearchParams()
  if (params?.employee_id) query.set('employee_id', params.employee_id)
  if (params?.status) query.set('status', params.status)
  if (params?.priority) query.set('priority', params.priority)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/grievances${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch grievances')
  return res.json()
}

export async function createGrievance(body: unknown): Promise<Grievance> {
  const res = await jsonPost(`${BASE}/grievances`, body)
  if (!res.ok) throw new Error('Failed to create grievance')
  return res.json()
}

export async function updateGrievance(id: string, body: unknown): Promise<Grievance> {
  const res = await jsonPut(`${BASE}/grievances/${id}`, body)
  if (!res.ok) throw new Error('Failed to update grievance')
  return res.json()
}

export async function deleteGrievance(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/grievances/${id}`)
  if (!res.ok) throw new Error('Failed to delete grievance')
}
