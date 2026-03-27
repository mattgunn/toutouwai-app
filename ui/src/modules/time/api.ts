import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { TimeEntry } from './types'

export async function fetchTimeEntries(params?: Record<string, string>): Promise<TimeEntry[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/time-entries${qs}`)
  if (!res.ok) throw new Error('Failed to fetch time entries')
  return res.json()
}

export async function createTimeEntry(body: unknown): Promise<TimeEntry> {
  const res = await jsonPost(`${BASE}/time-entries`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create time entry')
  return res.json()
}

export async function updateTimeEntry(id: string, body: unknown): Promise<TimeEntry> {
  const res = await jsonPut(`${BASE}/time-entries/${id}`, body)
  if (!res.ok) throw new Error('Failed to update time entry')
  return res.json()
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/time-entries/${id}`)
  if (!res.ok) throw new Error('Failed to delete time entry')
}
