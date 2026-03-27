import { BASE, authFetch, jsonPost, jsonPut } from '../shared/api'
import type { User } from './types'

export async function fetchSettings(): Promise<Record<string, unknown>> {
  const res = await authFetch(`${BASE}/settings`)
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export async function updateSettings(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await jsonPut(`${BASE}/settings`, body)
  if (!res.ok) throw new Error('Failed to update settings')
  return res.json()
}

export async function fetchUsers(): Promise<User[]> {
  const res = await authFetch(`${BASE}/settings/users`)
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}

export async function createUser(body: unknown): Promise<User> {
  const res = await jsonPost(`${BASE}/settings/users`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create user')
  return res.json()
}

export async function updateUser(id: string, body: unknown): Promise<User> {
  const res = await jsonPut(`${BASE}/settings/users/${id}`, body)
  if (!res.ok) throw new Error('Failed to update user')
  return res.json()
}
