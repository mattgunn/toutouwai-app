import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { NoticePeriod } from './types'

export async function fetchNoticePeriods(params?: { employee_id?: string; status?: string }): Promise<NoticePeriod[]> {
  const query = new URLSearchParams()
  if (params?.employee_id) query.set('employee_id', params.employee_id)
  if (params?.status) query.set('status', params.status)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/notice-periods${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch notice periods')
  return res.json()
}

export async function createNoticePeriod(body: unknown): Promise<NoticePeriod> {
  const res = await jsonPost(`${BASE}/notice-periods`, body)
  if (!res.ok) throw new Error('Failed to create notice period')
  return res.json()
}

export async function updateNoticePeriod(id: string, body: unknown): Promise<NoticePeriod> {
  const res = await jsonPut(`${BASE}/notice-periods/${id}`, body)
  if (!res.ok) throw new Error('Failed to update notice period')
  return res.json()
}

export async function deleteNoticePeriod(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/notice-periods/${id}`)
  if (!res.ok) throw new Error('Failed to delete notice period')
}
