import { BASE, authFetch, jsonPost, jsonPut } from '../shared/api'
import type { BenefitPlan, BenefitEnrollment } from './types'

export async function fetchBenefitPlans(): Promise<BenefitPlan[]> {
  const res = await authFetch(`${BASE}/benefits/plans`)
  if (!res.ok) throw new Error('Failed to fetch benefit plans')
  return res.json()
}

export async function createBenefitPlan(body: unknown): Promise<BenefitPlan> {
  const res = await jsonPost(`${BASE}/benefits/plans`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create benefit plan')
  return res.json()
}

export async function updateBenefitPlan(id: string, body: unknown): Promise<BenefitPlan> {
  const res = await jsonPut(`${BASE}/benefits/plans/${id}`, body)
  if (!res.ok) throw new Error('Failed to update benefit plan')
  return res.json()
}

export async function fetchBenefitEnrollments(params?: Record<string, string>): Promise<BenefitEnrollment[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/benefits/enrollments${qs}`)
  if (!res.ok) throw new Error('Failed to fetch enrollments')
  return res.json()
}

export async function createBenefitEnrollment(body: unknown): Promise<BenefitEnrollment> {
  const res = await jsonPost(`${BASE}/benefits/enrollments`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create enrollment')
  return res.json()
}

export async function updateBenefitEnrollment(id: string, body: unknown): Promise<BenefitEnrollment> {
  const res = await jsonPut(`${BASE}/benefits/enrollments/${id}`, body)
  if (!res.ok) throw new Error('Failed to update enrollment')
  return res.json()
}
