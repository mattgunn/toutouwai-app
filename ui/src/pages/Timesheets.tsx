import { useState, useEffect } from 'react'
import { fetchTimeEntries, fetchEmployees, createTimeEntry, updateTimeEntry, deleteTimeEntry } from '../api'
import type { TimeEntry, Employee } from '../types'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { useToast } from '../components/Toast'
import { formatDate } from '../utils/format'

const EMPTY_FORM = {
  employee_id: '',
  date: '',
  hours: '',
  project: '',
  description: '',
}

export default function Timesheets() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null)
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  const loadEntries = (from?: string, to?: string) => {
    const params: Record<string, string> = {}
    if (from) params.date_from = from
    if (to) params.date_to = to
    return fetchTimeEntries(params).then(setEntries)
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([
      loadEntries(dateFrom, dateTo),
      fetchEmployees().then(r => setEmployees(r.employees)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    loadEntries(dateFrom, dateTo).catch(() => {})
  }, [dateFrom, dateTo])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await createTimeEntry({
        employee_id: form.employee_id,
        date: form.date,
        hours: parseFloat(form.hours),
        project: form.project || null,
        description: form.description || null,
      })
      toast.success('Time entry logged')
      setShowModal(false)
      setForm(EMPTY_FORM)
      loadEntries(dateFrom, dateTo).catch(() => {})
    } catch {
      toast.error('Failed to log time entry')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (entry: TimeEntry) => {
    setEditingEntry(entry)
    setEditForm({
      employee_id: entry.employee_id,
      date: entry.date,
      hours: String(entry.hours),
      project: entry.project || '',
      description: entry.description || '',
    })
    setSelectedEntry(null)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry) return
    setEditSubmitting(true)
    try {
      await updateTimeEntry(editingEntry.id, {
        date: editForm.date,
        hours: parseFloat(editForm.hours),
        project: editForm.project || null,
        description: editForm.description || null,
      })
      toast.success('Time entry updated')
      setEditingEntry(null)
      loadEntries(dateFrom, dateTo).catch(() => {})
    } catch {
      toast.error('Failed to update time entry')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteTimeEntry(deleteId)
      toast.success('Time entry deleted')
      setDeleteId(null)
      setSelectedEntry(null)
      loadEntries(dateFrom, dateTo).catch(() => {})
    } catch {
      toast.error('Failed to delete time entry')
    } finally {
      setDeleting(false)
    }
  }

  const columns = [
    { key: 'employee_name', header: 'Employee', render: (entry: TimeEntry) => <span className="text-white">{entry.employee_name || '\u2014'}</span> },
    { key: 'date', header: 'Date', render: (entry: TimeEntry) => <span className="text-gray-400">{formatDate(entry.date)}</span> },
    { key: 'hours', header: 'Hours', render: (entry: TimeEntry) => <span className="text-white font-medium">{entry.hours}h</span> },
    { key: 'project', header: 'Project', className: 'hidden md:table-cell', render: (entry: TimeEntry) => <span className="text-gray-400">{entry.project || '\u2014'}</span> },
    { key: 'description', header: 'Description', className: 'hidden lg:table-cell', render: (entry: TimeEntry) => <span className="text-gray-400 truncate max-w-xs block">{entry.description || '\u2014'}</span> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Timesheets" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Timesheets"
        actions={<Button onClick={openCreate}>Log Time</Button>}
      />

      {/* Date range filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>
            Clear
          </Button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={entries}
        keyField="id"
        emptyIcon="⏱"
        emptyMessage="No time entries yet"
        onRowClick={(entry) => setSelectedEntry(entry)}
        striped
      />

      {/* Detail modal */}
      <Modal
        open={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="Time Entry Details"
        size="md"
        footer={
          selectedEntry ? (
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={() => { setDeleteId(selectedEntry.id) }}>Delete</Button>
              <Button size="sm" onClick={() => openEditModal(selectedEntry)}>Edit</Button>
            </div>
          ) : undefined
        }
      >
        {selectedEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Employee</p>
                <p className="text-sm text-white">{selectedEntry.employee_name || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Date</p>
                <p className="text-sm text-white">{formatDate(selectedEntry.date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Hours</p>
                <p className="text-sm text-white font-medium">{selectedEntry.hours}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Project</p>
                <p className="text-sm text-white">{selectedEntry.project || '\u2014'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-300">{selectedEntry.description || '\u2014'}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Log Time"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" form="time-form" loading={submitting}>Log Time</Button>
          </>
        }
      >
        <form id="time-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Employee" required>
            <Select
              value={form.employee_id}
              onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}
              required
              placeholder="Select employee"
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Hours" required>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={form.hours}
                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                required
                placeholder="8"
              />
            </FormField>
          </div>
          <FormField label="Project">
            <Input
              value={form.project}
              onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
              placeholder="Project name"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What did you work on?"
            />
          </FormField>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        title="Edit Time Entry"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingEntry(null)} disabled={editSubmitting}>Cancel</Button>
            <Button type="submit" form="edit-time-form" loading={editSubmitting}>Save Changes</Button>
          </>
        }
      >
        <form id="edit-time-form" onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date" required>
              <Input
                type="date"
                value={editForm.date}
                onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
                required
              />
            </FormField>
            <FormField label="Hours" required>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={editForm.hours}
                onChange={e => setEditForm(f => ({ ...f, hours: e.target.value }))}
                required
              />
            </FormField>
          </div>
          <FormField label="Project">
            <Input
              value={editForm.project}
              onChange={e => setEditForm(f => ({ ...f, project: e.target.value }))}
              placeholder="Project name"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={editForm.description}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What did you work on?"
            />
          </FormField>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Time Entry"
        message="Are you sure you want to delete this time entry? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
