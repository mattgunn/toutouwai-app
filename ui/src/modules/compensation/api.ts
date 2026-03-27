import { BASE, authFetch, jsonPost, jsonPut } from '../shared/api'
import type { CompensationRecord, CurrentCompensation } from './types'

export async function fetchCompensation(params?: Record<string, string>): Promise<CompensationRecord[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/compensation${qs}`)
  if (!res.ok) throw new Error('Failed to fetch compensation')
  return res.json()
}

export async function fetchCurrentCompensation(): Promise<CurrentCompensation[]> {
  const res = await authFetch(`${BASE}/compensation/current`)
  if (!res.ok) throw new Error('Failed to fetch current compensation')
  return res.json()
}

export async function createCompensation(body: unknown): Promise<CompensationRecord> {
  const res = await jsonPost(`${BASE}/compensation`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create compensation record')
  return res.json()
}

export async function updateCompensation(id: string, body: unknown): Promise<CompensationRecord> {
  const res = await jsonPut(`${BASE}/compensation/${id}`, body)
  if (!res.ok) throw new Error('Failed to update compensation record')
  return res.json()
}
