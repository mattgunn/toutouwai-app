import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { JobRequisition } from './types'

export async function fetchRequisitions(params?: { status?: string; department_id?: string }): Promise<JobRequisition[]> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.department_id) query.set('department_id', params.department_id)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/requisitions${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch requisitions')
  return res.json()
}

export async function createRequisition(body: unknown): Promise<JobRequisition> {
  const res = await jsonPost(`${BASE}/requisitions`, body)
  if (!res.ok) throw new Error('Failed to create requisition')
  return res.json()
}

export async function updateRequisition(id: string, body: unknown): Promise<JobRequisition> {
  const res = await jsonPut(`${BASE}/requisitions/${id}`, body)
  if (!res.ok) throw new Error('Failed to update requisition')
  return res.json()
}

export async function deleteRequisition(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/requisitions/${id}`)
  if (!res.ok) throw new Error('Failed to delete requisition')
}
