import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { ReviewCycle, Review, Goal, FeedbackRequest } from './types'

export async function fetchReviewCycles(): Promise<ReviewCycle[]> {
  const res = await authFetch(`${BASE}/performance/cycles`)
  if (!res.ok) throw new Error('Failed to fetch review cycles')
  return res.json()
}

export async function createReviewCycle(body: unknown): Promise<ReviewCycle> {
  const res = await jsonPost(`${BASE}/performance/cycles`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create review cycle')
  return res.json()
}

export async function fetchReviews(params?: Record<string, string>): Promise<Review[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/performance/reviews${qs}`)
  if (!res.ok) throw new Error('Failed to fetch reviews')
  return res.json()
}

export async function createReview(body: unknown): Promise<Review> {
  const res = await jsonPost(`${BASE}/performance/reviews`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create review')
  return res.json()
}

export async function updateReview(id: string, body: unknown): Promise<Review> {
  const res = await jsonPut(`${BASE}/performance/reviews/${id}`, body)
  if (!res.ok) throw new Error('Failed to update review')
  return res.json()
}

export async function fetchGoals(params?: Record<string, string>): Promise<Goal[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/performance/goals${qs}`)
  if (!res.ok) throw new Error('Failed to fetch goals')
  return res.json()
}

export async function createGoal(body: unknown): Promise<Goal> {
  const res = await jsonPost(`${BASE}/performance/goals`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create goal')
  return res.json()
}

export async function updateGoal(id: string, body: unknown): Promise<Goal> {
  const res = await jsonPut(`${BASE}/performance/goals/${id}`, body)
  if (!res.ok) throw new Error('Failed to update goal')
  return res.json()
}

export async function deleteGoal(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/performance/goals/${id}`)
  if (!res.ok) throw new Error('Failed to delete goal')
}

export async function fetchFeedbackRequests(params?: Record<string, string>): Promise<FeedbackRequest[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/performance/feedback${qs}`)
  if (!res.ok) throw new Error('Failed to fetch feedback requests')
  return res.json()
}

export async function createFeedbackRequest(body: unknown): Promise<FeedbackRequest> {
  const res = await jsonPost(`${BASE}/performance/feedback`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create feedback request')
  return res.json()
}

export async function updateFeedbackRequest(id: string, body: unknown): Promise<FeedbackRequest> {
  const res = await jsonPut(`${BASE}/performance/feedback/${id}`, body)
  if (!res.ok) throw new Error('Failed to update feedback request')
  return res.json()
}
