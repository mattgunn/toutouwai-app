import { BASE, authFetch } from '../shared/api'
import type {
  HeadcountReport,
  TurnoverReport,
  LeaveUtilizationReport,
  TimeSummaryReport,
  CompensationReport,
  RecruitmentReport,
  DiversityReport,
} from './types'

export async function fetchHeadcountReport(): Promise<HeadcountReport> {
  const res = await authFetch(`${BASE}/reports/headcount`)
  if (!res.ok) throw new Error('Failed to fetch headcount report')
  return res.json()
}

export async function fetchTurnoverReport(period?: string): Promise<TurnoverReport> {
  const qs = period ? `?period=${period}` : ''
  const res = await authFetch(`${BASE}/reports/turnover${qs}`)
  if (!res.ok) throw new Error('Failed to fetch turnover report')
  return res.json()
}

export async function fetchLeaveUtilizationReport(): Promise<LeaveUtilizationReport> {
  const res = await authFetch(`${BASE}/reports/leave-utilization`)
  if (!res.ok) throw new Error('Failed to fetch leave utilization report')
  return res.json()
}

export async function fetchTimeSummaryReport(params?: Record<string, string>): Promise<TimeSummaryReport> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/reports/time-summary${qs}`)
  if (!res.ok) throw new Error('Failed to fetch time summary report')
  return res.json()
}

export async function fetchCompensationReport(): Promise<CompensationReport> {
  const res = await authFetch(`${BASE}/reports/compensation`)
  if (!res.ok) throw new Error('Failed to fetch compensation report')
  return res.json()
}

export async function fetchRecruitmentReport(): Promise<RecruitmentReport> {
  const res = await authFetch(`${BASE}/reports/recruitment`)
  if (!res.ok) throw new Error('Failed to fetch recruitment report')
  return res.json()
}

export async function fetchDiversityReport(): Promise<DiversityReport> {
  const res = await authFetch(`${BASE}/reports/diversity`)
  if (!res.ok) throw new Error('Failed to fetch diversity report')
  return res.json()
}
