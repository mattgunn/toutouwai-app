import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { DisciplinaryAction } from './types'

export async function fetchDisciplinaryActions(params?: { employee_id?: string; status?: string }): Promise<DisciplinaryAction[]> {
  const query = new URLSearchParams()
  if (params?.employee_id) query.set('employee_id', params.employee_id)
  if (params?.status) query.set('status', params.status)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/disciplinary${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch disciplinary actions')
  return res.json()
}

export async function createDisciplinaryAction(body: unknown): Promise<DisciplinaryAction> {
  const res = await jsonPost(`${BASE}/disciplinary`, body)
  if (!res.ok) throw new Error('Failed to create disciplinary action')
  return res.json()
}

export async function updateDisciplinaryAction(id: string, body: unknown): Promise<DisciplinaryAction> {
  const res = await jsonPut(`${BASE}/disciplinary/${id}`, body)
  if (!res.ok) throw new Error('Failed to update disciplinary action')
  return res.json()
}

export async function deleteDisciplinaryAction(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/disciplinary/${id}`)
  if (!res.ok) throw new Error('Failed to delete disciplinary action')
}
