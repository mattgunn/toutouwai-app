import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Department } from './types'

export async function fetchDepartments(): Promise<Department[]> {
  const res = await authFetch(`${BASE}/departments`)
  if (!res.ok) throw new Error('Failed to fetch departments')
  return res.json()
}

export async function createDepartment(body: unknown): Promise<Department> {
  const res = await jsonPost(`${BASE}/departments`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create department')
  return res.json()
}

export async function updateDepartment(id: string, body: unknown): Promise<Department> {
  const res = await jsonPut(`${BASE}/departments/${id}`, body)
  if (!res.ok) throw new Error('Failed to update department')
  return res.json()
}

export async function deleteDepartment(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/departments/${id}`)
  if (!res.ok) throw new Error('Failed to delete department')
}
