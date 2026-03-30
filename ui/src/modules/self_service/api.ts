import { BASE, authFetch, jsonPost, jsonPut } from '../shared/api'
import type { Employee } from '../employees/types'
import type { LeaveRequest, LeaveBalance } from '../leave/types'
import type { TimeEntry } from '../time/types'
import type { Document } from '../documents/types'
import type { OnboardingChecklist } from '../onboarding/types'
import type { CompensationRecord } from '../compensation/types'
import type { Goal } from '../performance/types'
import type { BenefitEnrollment } from '../benefits/types'

export async function fetchMyProfile(): Promise<Employee> {
  const res = await authFetch(`${BASE}/self-service/profile`)
  if (!res.ok) throw new Error('Failed to fetch profile')
  return res.json()
}

export async function updateMyProfile(body: unknown): Promise<Employee> {
  const res = await jsonPut(`${BASE}/self-service/profile`, body)
  if (!res.ok) throw new Error('Failed to update profile')
  return res.json()
}

export async function fetchMyLeave(): Promise<LeaveRequest[]> {
  const res = await authFetch(`${BASE}/self-service/leave`)
  if (!res.ok) throw new Error('Failed to fetch leave requests')
  return res.json()
}

export async function submitMyLeave(body: unknown): Promise<LeaveRequest> {
  const res = await jsonPost(`${BASE}/self-service/leave`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to submit leave request')
  return res.json()
}

export async function fetchMyLeaveBalances(): Promise<LeaveBalance[]> {
  const res = await authFetch(`${BASE}/self-service/leave/balances`)
  if (!res.ok) throw new Error('Failed to fetch leave balances')
  return res.json()
}

export async function fetchMyTime(): Promise<TimeEntry[]> {
  const res = await authFetch(`${BASE}/self-service/time`)
  if (!res.ok) throw new Error('Failed to fetch time entries')
  return res.json()
}

export async function submitMyTime(body: unknown): Promise<TimeEntry> {
  const res = await jsonPost(`${BASE}/self-service/time`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to submit time entry')
  return res.json()
}

export async function fetchMyDocuments(): Promise<Document[]> {
  const res = await authFetch(`${BASE}/self-service/documents`)
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

export async function fetchMyOnboarding(): Promise<OnboardingChecklist[]> {
  const res = await authFetch(`${BASE}/self-service/onboarding`)
  if (!res.ok) throw new Error('Failed to fetch onboarding')
  return res.json()
}

export async function fetchMyCompensation(): Promise<CompensationRecord[]> {
  const res = await authFetch(`${BASE}/self-service/compensation`)
  if (!res.ok) throw new Error('Failed to fetch compensation')
  return res.json()
}

export async function fetchMyGoals(): Promise<Goal[]> {
  const res = await authFetch(`${BASE}/self-service/goals`)
  if (!res.ok) throw new Error('Failed to fetch goals')
  return res.json()
}

export async function createMyGoal(body: unknown): Promise<Goal> {
  const res = await jsonPost(`${BASE}/self-service/goals`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create goal')
  return res.json()
}

export async function updateMyGoal(goalId: string, body: unknown): Promise<Goal> {
  const res = await jsonPut(`${BASE}/self-service/goals/${goalId}`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to update goal')
  return res.json()
}

export async function fetchMyBenefits(): Promise<BenefitEnrollment[]> {
  const res = await authFetch(`${BASE}/self-service/benefits`)
  if (!res.ok) throw new Error('Failed to fetch benefits')
  return res.json()
}
