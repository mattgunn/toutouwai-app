import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Skill, EmployeeSkill } from './types'

// --- Skill Catalog ---

export async function fetchSkills(): Promise<Skill[]> {
  const res = await authFetch(`${BASE}/skills/catalog`)
  if (!res.ok) throw new Error('Failed to fetch skills')
  return res.json()
}

export async function createSkill(body: unknown): Promise<Skill> {
  const res = await jsonPost(`${BASE}/skills/catalog`, body)
  if (!res.ok) throw new Error('Failed to create skill')
  return res.json()
}

export async function updateSkill(id: string, body: unknown): Promise<Skill> {
  const res = await jsonPut(`${BASE}/skills/catalog/${id}`, body)
  if (!res.ok) throw new Error('Failed to update skill')
  return res.json()
}

export async function deleteSkill(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/skills/catalog/${id}`)
  if (!res.ok) throw new Error('Failed to delete skill')
}

// --- Employee Skills ---

export async function fetchEmployeeSkills(params?: { employee_id?: string; skill_id?: string }): Promise<EmployeeSkill[]> {
  const query = new URLSearchParams()
  if (params?.employee_id) query.set('employee_id', params.employee_id)
  if (params?.skill_id) query.set('skill_id', params.skill_id)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/skills/employee${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch employee skills')
  return res.json()
}

export async function createEmployeeSkill(body: unknown): Promise<EmployeeSkill> {
  const res = await jsonPost(`${BASE}/skills/employee`, body)
  if (!res.ok) throw new Error('Failed to create employee skill')
  return res.json()
}

export async function updateEmployeeSkill(id: string, body: unknown): Promise<EmployeeSkill> {
  const res = await jsonPut(`${BASE}/skills/employee/${id}`, body)
  if (!res.ok) throw new Error('Failed to update employee skill')
  return res.json()
}

export async function deleteEmployeeSkill(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/skills/employee/${id}`)
  if (!res.ok) throw new Error('Failed to delete employee skill')
}
