import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Position } from './types'

export async function fetchPositions(): Promise<Position[]> {
  const res = await authFetch(`${BASE}/positions`)
  if (!res.ok) throw new Error('Failed to fetch positions')
  return res.json()
}

export async function createPosition(body: unknown): Promise<Position> {
  const res = await jsonPost(`${BASE}/positions`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create position')
  return res.json()
}

export async function updatePosition(id: string, body: unknown): Promise<Position> {
  const res = await jsonPut(`${BASE}/positions/${id}`, body)
  if (!res.ok) throw new Error('Failed to update position')
  return res.json()
}

export async function deletePosition(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/positions/${id}`)
  if (!res.ok) throw new Error('Failed to delete position')
}
