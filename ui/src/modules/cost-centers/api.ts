import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { CostCenter } from './types'

export async function fetchCostCenters(): Promise<CostCenter[]> {
  const res = await authFetch(`${BASE}/cost-centers`)
  if (!res.ok) throw new Error('Failed to fetch cost centers')
  return res.json()
}

export async function createCostCenter(body: unknown): Promise<CostCenter> {
  const res = await jsonPost(`${BASE}/cost-centers`, body)
  if (!res.ok) throw new Error('Failed to create cost center')
  return res.json()
}

export async function updateCostCenter(id: string, body: unknown): Promise<CostCenter> {
  const res = await jsonPut(`${BASE}/cost-centers/${id}`, body)
  if (!res.ok) throw new Error('Failed to update cost center')
  return res.json()
}

export async function deleteCostCenter(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/cost-centers/${id}`)
  if (!res.ok) throw new Error('Failed to delete cost center')
}
