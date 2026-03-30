import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { JobPosting, Applicant, Interview, Offer } from './types'

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

export async function deleteJobPosting(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/recruitment/postings/${id}`)
  if (!res.ok) throw new Error('Failed to delete job posting')
}

export async function deleteApplicant(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/recruitment/applicants/${id}`)
  if (!res.ok) throw new Error('Failed to delete applicant')
}

// ── Interviews ──────────────────────────────────────────────────────

export async function fetchInterviews(params?: Record<string, string>): Promise<Interview[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/recruitment/interviews${qs}`)
  if (!res.ok) throw new Error('Failed to fetch interviews')
  return res.json()
}

export async function createInterview(body: unknown): Promise<Interview> {
  const res = await jsonPost(`${BASE}/recruitment/interviews`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create interview')
  return res.json()
}

export async function updateInterview(id: string, body: unknown): Promise<Interview> {
  const res = await jsonPut(`${BASE}/recruitment/interviews/${id}`, body)
  if (!res.ok) throw new Error('Failed to update interview')
  return res.json()
}

export async function deleteInterview(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/recruitment/interviews/${id}`)
  if (!res.ok) throw new Error('Failed to delete interview')
}

// ── Offers ──────────────────────────────────────────────────────────

export async function fetchOffers(params?: Record<string, string>): Promise<Offer[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/recruitment/offers${qs}`)
  if (!res.ok) throw new Error('Failed to fetch offers')
  return res.json()
}

export async function createOffer(body: unknown): Promise<Offer> {
  const res = await jsonPost(`${BASE}/recruitment/offers`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create offer')
  return res.json()
}

export async function updateOffer(id: string, body: unknown): Promise<Offer> {
  const res = await jsonPut(`${BASE}/recruitment/offers/${id}`, body)
  if (!res.ok) throw new Error('Failed to update offer')
  return res.json()
}
