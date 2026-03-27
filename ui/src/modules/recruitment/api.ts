import { BASE, authFetch, jsonPost, jsonPut } from '../shared/api'
import type { JobPosting, Applicant } from './types'

export async function fetchJobPostings(params?: Record<string, string>): Promise<JobPosting[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/recruitment/postings${qs}`)
  if (!res.ok) throw new Error('Failed to fetch job postings')
  return res.json()
}

export async function fetchJobPosting(id: string): Promise<JobPosting> {
  const res = await authFetch(`${BASE}/recruitment/postings/${id}`)
  if (!res.ok) throw new Error('Failed to fetch job posting')
  return res.json()
}

export async function createJobPosting(body: unknown): Promise<JobPosting> {
  const res = await jsonPost(`${BASE}/recruitment/postings`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create job posting')
  return res.json()
}

export async function updateJobPosting(id: string, body: unknown): Promise<JobPosting> {
  const res = await jsonPut(`${BASE}/recruitment/postings/${id}`, body)
  if (!res.ok) throw new Error('Failed to update job posting')
  return res.json()
}

export async function fetchApplicants(params?: Record<string, string>): Promise<Applicant[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/recruitment/applicants${qs}`)
  if (!res.ok) throw new Error('Failed to fetch applicants')
  return res.json()
}

export async function fetchApplicant(id: string): Promise<Applicant> {
  const res = await authFetch(`${BASE}/recruitment/applicants/${id}`)
  if (!res.ok) throw new Error('Failed to fetch applicant')
  return res.json()
}

export async function createApplicant(body: unknown): Promise<Applicant> {
  const res = await jsonPost(`${BASE}/recruitment/applicants`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create applicant')
  return res.json()
}

export async function updateApplicant(id: string, body: unknown): Promise<Applicant> {
  const res = await jsonPut(`${BASE}/recruitment/applicants/${id}`, body)
  if (!res.ok) throw new Error('Failed to update applicant')
  return res.json()
}

export async function updateApplicantStage(id: string, stage: string): Promise<Applicant> {
  const res = await jsonPut(`${BASE}/recruitment/applicants/${id}/stage`, { stage })
  if (!res.ok) throw new Error('Failed to update applicant stage')
  return res.json()
}
