import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { ProbationPeriod } from './types'

export async function fetchProbations(params?: { employee_id?: string; status?: string }): Promise<ProbationPeriod[]> {
  const query = new URLSearchParams()
  if (params?.employee_id) query.set('employee_id', params.employee_id)
  if (params?.status) query.set('status', params.status)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/probation${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch probation periods')
  return res.json()
}

export async function createProbation(body: unknown): Promise<ProbationPeriod> {
  const res = await jsonPost(`${BASE}/probation`, body)
  if (!res.ok) throw new Error('Failed to create probation period')
  return res.json()
}

export async function updateProbation(id: string, body: unknown): Promise<ProbationPeriod> {
  const res = await jsonPut(`${BASE}/probation/${id}`, body)
  if (!res.ok) throw new Error('Failed to update probation period')
  return res.json()
}

export async function deleteProbation(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/probation/${id}`)
  if (!res.ok) throw new Error('Failed to delete probation period')
}
