import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { CompensationComponent } from './types'

export async function fetchCompComponents(employeeId?: string): Promise<CompensationComponent[]> {
  const qs = employeeId ? `?employee_id=${employeeId}` : ''
  const res = await authFetch(`${BASE}/compensation/components${qs}`)
  if (!res.ok) throw new Error('Failed to fetch compensation components')
  return res.json()
}

export async function createCompComponent(body: unknown): Promise<CompensationComponent> {
  const res = await jsonPost(`${BASE}/compensation/components`, body)
  if (!res.ok) throw new Error('Failed to create compensation component')
  return res.json()
}

export async function updateCompComponent(id: string, body: unknown): Promise<CompensationComponent> {
  const res = await jsonPut(`${BASE}/compensation/components/${id}`, body)
  if (!res.ok) throw new Error('Failed to update compensation component')
  return res.json()
}

export async function deleteCompComponent(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/compensation/components/${id}`)
  if (!res.ok) throw new Error('Failed to delete compensation component')
}
