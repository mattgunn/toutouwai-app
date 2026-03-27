import { BASE, authFetch, jsonPost, jsonPut } from '../shared/api'
import type { LeaveType, LeaveRequest, LeaveBalance } from './types'

export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  const res = await authFetch(`${BASE}/leave/types`)
  if (!res.ok) throw new Error('Failed to fetch leave types')
  return res.json()
}

export async function fetchLeaveRequests(params?: Record<string, string>): Promise<LeaveRequest[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/leave/requests${qs}`)
  if (!res.ok) throw new Error('Failed to fetch leave requests')
  return res.json()
}

export async function createLeaveRequest(body: unknown): Promise<LeaveRequest> {
  const res = await jsonPost(`${BASE}/leave/requests`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create leave request')
  return res.json()
}

export async function updateLeaveRequestStatus(id: string, status: string): Promise<LeaveRequest> {
  const res = await jsonPut(`${BASE}/leave/requests/${id}/status`, { status })
  if (!res.ok) throw new Error('Failed to update leave request')
  return res.json()
}

export async function fetchLeaveBalances(): Promise<LeaveBalance[]> {
  const res = await authFetch(`${BASE}/leave/balances`)
  if (!res.ok) throw new Error('Failed to fetch leave balances')
  return res.json()
}
