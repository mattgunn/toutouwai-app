import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { SuccessionPlan, SuccessionCandidate } from './types'

export async function fetchSuccessionPlans(): Promise<SuccessionPlan[]> {
  const res = await authFetch(`${BASE}/succession`)
  if (!res.ok) throw new Error('Failed to fetch succession plans')
  return res.json()
}

export async function createSuccessionPlan(body: unknown): Promise<SuccessionPlan> {
  const res = await jsonPost(`${BASE}/succession`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create succession plan')
  return res.json()
}

export async function updateSuccessionPlan(id: string, body: unknown): Promise<SuccessionPlan> {
  const res = await jsonPut(`${BASE}/succession/${id}`, body)
  if (!res.ok) throw new Error('Failed to update succession plan')
  return res.json()
}

export async function fetchSuccessionCandidates(planId: string): Promise<SuccessionCandidate[]> {
  const res = await authFetch(`${BASE}/succession/${planId}/candidates`)
  if (!res.ok) throw new Error('Failed to fetch candidates')
  return res.json()
}

export async function addSuccessionCandidate(planId: string, body: unknown): Promise<SuccessionCandidate> {
  const res = await jsonPost(`${BASE}/succession/${planId}/candidates`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to add candidate')
  return res.json()
}

export async function updateSuccessionCandidate(candidateId: string, body: unknown): Promise<SuccessionCandidate> {
  const res = await jsonPut(`${BASE}/succession/candidates/${candidateId}`, body)
  if (!res.ok) throw new Error('Failed to update candidate')
  return res.json()
}

export async function removeSuccessionCandidate(candidateId: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/succession/candidates/${candidateId}`)
  if (!res.ok) throw new Error('Failed to remove candidate')
}
