import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Location } from './types'

export async function fetchLocations(): Promise<Location[]> {
  const res = await authFetch(`${BASE}/locations`)
  if (!res.ok) throw new Error('Failed to fetch locations')
  return res.json()
}

export async function createLocation(body: unknown): Promise<Location> {
  const res = await jsonPost(`${BASE}/locations`, body)
  if (!res.ok) throw new Error('Failed to create location')
  return res.json()
}

export async function updateLocation(id: string, body: unknown): Promise<Location> {
  const res = await jsonPut(`${BASE}/locations/${id}`, body)
  if (!res.ok) throw new Error('Failed to update location')
  return res.json()
}

export async function deleteLocation(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/locations/${id}`)
  if (!res.ok) throw new Error('Failed to delete location')
}
