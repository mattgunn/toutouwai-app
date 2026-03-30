import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Notification } from './types'

export async function fetchNotifications(isRead?: string): Promise<Notification[]> {
  const qs = isRead !== undefined ? `?is_read=${isRead}` : ''
  const res = await authFetch(`${BASE}/notifications${qs}`)
  if (!res.ok) throw new Error('Failed to fetch notifications')
  return res.json()
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  const res = await authFetch(`${BASE}/notifications?is_read=0&count=true`)
  if (!res.ok) throw new Error('Failed to fetch unread count')
  return res.json()
}

export async function createNotification(body: unknown): Promise<Notification> {
  const res = await jsonPost(`${BASE}/notifications`, body)
  if (!res.ok) throw new Error('Failed to create notification')
  return res.json()
}

export async function markAsRead(id: string): Promise<Notification> {
  const res = await jsonPut(`${BASE}/notifications/${id}`, { is_read: 1 })
  if (!res.ok) throw new Error('Failed to mark notification as read')
  return res.json()
}

export async function markAllAsRead(): Promise<void> {
  const res = await jsonPut(`${BASE}/notifications/mark-all-read`, {})
  if (!res.ok) throw new Error('Failed to mark all notifications as read')
}

export async function deleteNotification(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/notifications/${id}`)
  if (!res.ok) throw new Error('Failed to delete notification')
}
