import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Delegation } from './types'

export async function fetchDelegations(params?: { delegator_id?: string; delegate_id?: string }): Promise<Delegation[]> {
  const query = new URLSearchParams()
  if (params?.delegator_id) query.set('delegator_id', params.delegator_id)
  if (params?.delegate_id) query.set('delegate_id', params.delegate_id)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/delegations${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch delegations')
  return res.json()
}

export async function fetchActiveDelegations(): Promise<Delegation[]> {
  const res = await authFetch(`${BASE}/delegations?is_active=1`)
  if (!res.ok) throw new Error('Failed to fetch active delegations')
  return res.json()
}

export async function createDelegation(body: unknown): Promise<Delegation> {
  const res = await jsonPost(`${BASE}/delegations`, body)
  if (!res.ok) throw new Error('Failed to create delegation')
  return res.json()
}

export async function updateDelegation(id: string, body: unknown): Promise<Delegation> {
  const res = await jsonPut(`${BASE}/delegations/${id}`, body)
  if (!res.ok) throw new Error('Failed to update delegation')
  return res.json()
}

export async function deleteDelegation(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/delegations/${id}`)
  if (!res.ok) throw new Error('Failed to delete delegation')
}
