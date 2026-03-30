import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Asset } from './types'

export async function fetchAssets(params?: { status?: string; assigned_to?: string }): Promise<Asset[]> {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.assigned_to) query.set('assigned_to', params.assigned_to)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/assets${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch assets')
  return res.json()
}

export async function createAsset(body: unknown): Promise<Asset> {
  const res = await jsonPost(`${BASE}/assets`, body)
  if (!res.ok) throw new Error('Failed to create asset')
  return res.json()
}

export async function updateAsset(id: string, body: unknown): Promise<Asset> {
  const res = await jsonPut(`${BASE}/assets/${id}`, body)
  if (!res.ok) throw new Error('Failed to update asset')
  return res.json()
}

export async function deleteAsset(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/assets/${id}`)
  if (!res.ok) throw new Error('Failed to delete asset')
}
