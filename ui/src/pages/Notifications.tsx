import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../modules/notifications/api'
import type { Notification } from '../modules/notifications/types'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'

export default function Notifications() {
  const toast = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await fetchNotifications()
      setNotifications(data)
    } catch {
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const reloadNotifications = () => fetchNotifications().then(setNotifications).catch(() => toast.error('Failed to reload notifications'))

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id)
      toast.success('Marked as read')
      reloadNotifications()
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      toast.success('All notifications marked as read')
      reloadNotifications()
    } catch {
      toast.error('Failed to mark all as read')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteNotification(deleteConfirm.id)
      toast.success('Notification deleted')
      reloadNotifications()
    } catch {
      toast.error('Failed to delete notification')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter(n => !n.is_read)

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (loading) {
    return (
      <div>
        <PageHeader title="Notifications" />
        <SkeletonTable rows={5} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        actions={
          unreadCount > 0 ? (
            <Button onClick={handleMarkAllAsRead}>Mark All as Read</Button>
          ) : undefined
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'unread'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {f === 'all' ? `All (${notifications.length})` : `Unread (${unreadCount})`}
          </button>
        ))}
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-1">{filter === 'unread' ? 'No unread notifications' : 'No notifications'}</p>
          <p className="text-sm">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map(n => (
            <div
              key={n.id}
              className={`rounded-lg border p-4 transition-colors ${
                n.is_read
                  ? 'bg-gray-900 border-gray-800'
                  : 'bg-gray-900/80 border-blue-900/50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                    <h3 className="text-white font-medium truncate">{n.title}</h3>
                    {n.type && <StatusBadge status={n.type} />}
                  </div>
                  {n.message && (
                    <p className="text-gray-400 text-sm mt-1">{n.message}</p>
                  )}
                  <p className="text-gray-600 text-xs mt-2">{formatDate(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.is_read && (
                    <Button variant="secondary" onClick={() => handleMarkAsRead(n.id)}>
                      Mark Read
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => setDeleteConfirm({ id: n.id, title: n.title })}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Notification"
        message={`Are you sure you want to delete "${deleteConfirm?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}
