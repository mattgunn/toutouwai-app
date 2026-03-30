import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { JobHistoryEntry } from './types'

export async function fetchJobHistory(employeeId?: string): Promise<JobHistoryEntry[]> {
  const qs = employeeId ? `?employee_id=${employeeId}` : ''
  const res = await authFetch(`${BASE}/job-history${qs}`)
  if (!res.ok) throw new Error('Failed to fetch job history')
  return res.json()
}

export async function createJobHistory(body: unknown): Promise<JobHistoryEntry> {
  const res = await jsonPost(`${BASE}/job-history`, body)
  if (!res.ok) throw new Error('Failed to create job history')
  return res.json()
}

export async function updateJobHistory(id: string, body: unknown): Promise<JobHistoryEntry> {
  const res = await jsonPut(`${BASE}/job-history/${id}`, body)
  if (!res.ok) throw new Error('Failed to update job history')
  return res.json()
}

export async function deleteJobHistory(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/job-history/${id}`)
  if (!res.ok) throw new Error('Failed to delete job history')
}
