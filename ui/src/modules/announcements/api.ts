import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Announcement } from './types'

export async function fetchAnnouncements(params?: { category?: string; is_active?: string }): Promise<Announcement[]> {
  const query = new URLSearchParams()
  if (params?.category) query.set('category', params.category)
  if (params?.is_active) query.set('is_active', params.is_active)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/announcements${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch announcements')
  return res.json()
}

export async function fetchActiveAnnouncements(): Promise<Announcement[]> {
  const res = await authFetch(`${BASE}/announcements?is_active=1`)
  if (!res.ok) throw new Error('Failed to fetch active announcements')
  return res.json()
}

export async function createAnnouncement(body: unknown): Promise<Announcement> {
  const res = await jsonPost(`${BASE}/announcements`, body)
  if (!res.ok) throw new Error('Failed to create announcement')
  return res.json()
}

export async function updateAnnouncement(id: string, body: unknown): Promise<Announcement> {
  const res = await jsonPut(`${BASE}/announcements/${id}`, body)
  if (!res.ok) throw new Error('Failed to update announcement')
  return res.json()
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/announcements/${id}`)
  if (!res.ok) throw new Error('Failed to delete announcement')
}
