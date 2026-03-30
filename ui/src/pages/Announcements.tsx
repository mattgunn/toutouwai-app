import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../modules/announcements/api'
import type { Announcement } from '../modules/announcements/types'
import StatusBadge from '../components/StatusBadge'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Tabs from '../components/Tabs'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function Announcements() {
  const toast = useToast()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const data = await fetchAnnouncements()
      setAnnouncements(data)
    } catch {
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const reloadAnnouncements = () => fetchAnnouncements().then(setAnnouncements).catch(() => toast.error('Failed to reload announcements'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteAnnouncement(deleteConfirm.id)
      toast.success('Announcement deleted')
      reloadAnnouncements()
    } catch {
      toast.error('Failed to delete announcement')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Announcements" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Announcements"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>New Announcement</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'title', header: 'Title', render: (row) => <span className="text-white font-medium">{String(row.title)}</span> },
          { key: 'category', header: 'Category', render: (row) => <span className="text-gray-400 capitalize">{String(row.category || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'priority', header: 'Priority', render: (row) => <StatusBadge status={String(row.priority)} /> },
          { key: 'publish_date', header: 'Published', render: (row) => <span className="text-gray-400">{row.publish_date ? formatDate(String(row.publish_date)) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'expiry_date', header: 'Expires', render: (row) => <span className="text-gray-400">{row.expiry_date ? formatDate(String(row.expiry_date)) : '-'}</span>, className: 'hidden lg:table-cell' },
          { key: 'is_active', header: 'Status', render: (row) => row.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" /> },
        ]}
        data={announcements as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const ann = announcements.find(a => a.id === row.id)
          if (ann) { setEditing(ann); setShowModal(true) }
        }}
        emptyIcon="📢"
        emptyMessage="No announcements yet"
        emptyAction="New Announcement"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <AnnouncementModal
        open={showModal}
        announcement={editing}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadAnnouncements() }}
        onDelete={(a) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: a.id, name: a.title }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Announcement"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Announcement Modal ---

function AnnouncementModal({
  open,
  announcement,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  announcement: Announcement | null
  onClose: () => void
  onSaved: () => void
  onDelete: (a: Announcement) => void
}) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('normal')
  const [publishDate, setPublishDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(announcement?.title ?? '')
      setContent(announcement?.content ?? '')
      setCategory(announcement?.category ?? 'general')
      setPriority(announcement?.priority ?? 'normal')
      setPublishDate(announcement?.publish_date ?? '')
      setExpiryDate(announcement?.expiry_date ?? '')
      setIsActive(announcement ? !!announcement.is_active : true)
    }
  }, [open, announcement])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        title,
        content: content || null,
        category,
        priority,
        publish_date: publishDate || null,
        expiry_date: expiryDate || null,
        is_active: isActive ? 1 : 0,
      }
      if (announcement) {
        await updateAnnouncement(announcement.id, body)
        toast.success('Announcement updated')
      } else {
        await createAnnouncement(body)
        toast.success('Announcement created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${announcement ? 'update' : 'create'} announcement`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={announcement ? 'Edit Announcement' : 'New Announcement'} size="lg" footer={
      <>
        {announcement && (
          <Button variant="danger" onClick={() => onDelete(announcement)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!title} loading={submitting}>
          {announcement ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Title" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Announcement title" />
        </FormField>
        <FormField label="Content">
          <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Announcement content" rows={5} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category">
            <Select value={category} onChange={e => setCategory(e.target.value)} options={[
              { value: 'general', label: 'General' },
              { value: 'company', label: 'Company' },
              { value: 'hr', label: 'HR' },
              { value: 'it', label: 'IT' },
              { value: 'policy', label: 'Policy' },
              { value: 'event', label: 'Event' },
              { value: 'emergency', label: 'Emergency' },
            ]} />
          </FormField>
          <FormField label="Priority">
            <Select value={priority} onChange={e => setPriority(e.target.value)} options={[
              { value: 'low', label: 'Low' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Publish Date">
            <Input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)} />
          </FormField>
          <FormField label="Expiry Date">
            <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
          </FormField>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
            Active
          </label>
        </div>
      </div>
    </Modal>
  )
}
