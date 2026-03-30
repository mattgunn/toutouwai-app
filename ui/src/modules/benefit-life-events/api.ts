import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { BenefitLifeEvent } from './types'

export async function fetchLifeEvents(params?: { employee_id?: string; status?: string; event_type?: string }): Promise<BenefitLifeEvent[]> {
  const query = new URLSearchParams()
  if (params?.employee_id) query.set('employee_id', params.employee_id)
  if (params?.status) query.set('status', params.status)
  if (params?.event_type) query.set('event_type', params.event_type)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/benefits/life-events${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch life events')
  return res.json()
}

export async function createLifeEvent(body: unknown): Promise<BenefitLifeEvent> {
  const res = await jsonPost(`${BASE}/benefits/life-events`, body)
  if (!res.ok) throw new Error('Failed to create life event')
  return res.json()
}

export async function updateLifeEvent(id: string, body: unknown): Promise<BenefitLifeEvent> {
  const res = await jsonPut(`${BASE}/benefits/life-events/${id}`, body)
  if (!res.ok) throw new Error('Failed to update life event')
  return res.json()
}

export async function deleteLifeEvent(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/benefits/life-events/${id}`)
  if (!res.ok) throw new Error('Failed to delete life event')
}
