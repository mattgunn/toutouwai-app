import { BASE, authFetch, jsonPost, jsonDelete } from '../shared/api'
import type { TrainingPrerequisite } from './types'

export async function fetchPrerequisites(courseId?: string): Promise<TrainingPrerequisite[]> {
  const qs = courseId ? `?course_id=${courseId}` : ''
  const res = await authFetch(`${BASE}/learning/prerequisites${qs}`)
  if (!res.ok) throw new Error('Failed to fetch prerequisites')
  return res.json()
}

export async function createPrerequisite(body: unknown): Promise<TrainingPrerequisite> {
  const res = await jsonPost(`${BASE}/learning/prerequisites`, body)
  if (!res.ok) throw new Error('Failed to create prerequisite')
  return res.json()
}

export async function deletePrerequisite(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/learning/prerequisites/${id}`)
  if (!res.ok) throw new Error('Failed to delete prerequisite')
}
