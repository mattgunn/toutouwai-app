import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchLifeEvents,
  createLifeEvent,
  updateLifeEvent,
  deleteLifeEvent,
} from '../modules/benefit-life-events/api'
import { fetchEmployees } from '../modules/employees/api'
import type { BenefitLifeEvent } from '../modules/benefit-life-events/types'
import type { Employee } from '../modules/employees/types'
import StatusBadge from '../components/StatusBadge'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function BenefitLifeEvents() {
  const toast = useToast()
  const [events, setEvents] = useState<BenefitLifeEvent[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Filter
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<BenefitLifeEvent | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [ev, emp] = await Promise.all([
        fetchLifeEvents(),
        fetchEmployees(),
      ])
      setEvents(ev)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load life events')
    } finally {
      setLoading(false)
    }
  }

  const reloadEvents = () => fetchLifeEvents().then(setEvents).catch(() => toast.error('Failed to reload life events'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteLifeEvent(deleteConfirm.id)
      toast.success('Life event deleted')
      reloadEvents()
    } catch {
      toast.error('Failed to delete life event')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const filteredEvents = statusFilter === 'all'
    ? events
    : events.filter(e => e.status === statusFilter)

  if (loading) {
    return (
      <div>
        <PageHeader title="Benefit Life Events" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Benefit Life Events"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Life Event</Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'pending', 'in_review', 'approved', 'processed', 'denied'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'employee_name', header: 'Employee', render: (row) => <EmployeeLink employeeId={String(row.employee_id)} name={String(row.employee_name)} /> },
          { key: 'event_type', header: 'Event Type', render: (row) => <StatusBadge status={String(row.event_type)} /> },
          { key: 'event_date', header: 'Event Date', render: (row) => <span className="text-gray-400">{row.event_date ? formatDate(String(row.event_date)) : '-'}</span> },
          { key: 'description', header: 'Description', render: (row) => <span className="text-gray-400">{row.description ? String(row.description) : '-'}</span>, className: 'hidden lg:table-cell' },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          { key: 'processed_at', header: 'Processed', render: (row) => <span className="text-gray-400">{row.processed_at ? formatDate(String(row.processed_at)) : '-'}</span>, className: 'hidden lg:table-cell' },
        ]}
        data={filteredEvents as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const ev = events.find(e => e.id === row.id)
          if (ev) { setEditing(ev); setShowModal(true) }
        }}
        emptyIcon="📋"
        emptyMessage="No life events found"
        emptyAction="Add Life Event"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      {/* Life Event Modal */}
      <LifeEventModal
        open={showModal}
        event={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadEvents() }}
        onDelete={(ev) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: ev.id, name: `${ev.employee_name} - ${ev.event_type}` }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Life Event"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Life Event Modal ---

function LifeEventModal({
  open,
  event,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  event: BenefitLifeEvent | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (ev: BenefitLifeEvent) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [eventType, setEventType] = useState('marriage')
  const [eventDate, setEventDate] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('pending')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(event?.employee_id ?? '')
      setEventType(event?.event_type ?? 'marriage')
      setEventDate(event?.event_date ?? '')
      setDescription(event?.description ?? '')
      setStatus(event?.status ?? 'pending')
    }
  }, [open, event])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        event_type: eventType,
        event_date: eventDate,
        description: description || null,
        status,
      }
      if (event) {
        await updateLifeEvent(event.id, body)
        toast.success('Life event updated')
      } else {
        await createLifeEvent(body)
        toast.success('Life event created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${event ? 'update' : 'create'} life event`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={event ? 'Edit Life Event' : 'Add Life Event'} size="lg" footer={
      <>
        {event && (
          <Button variant="danger" onClick={() => onDelete(event)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !eventDate} loading={submitting}>
          {event ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Employee" required>
          <Select
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            options={[
              { value: '', label: 'Select employee...' },
              ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
            ]}
            disabled={!!event}
          />
        </FormField>
        <FormField label="Event Type" required>
          <Select value={eventType} onChange={e => setEventType(e.target.value)} options={[
            { value: 'marriage', label: 'Marriage' },
            { value: 'divorce', label: 'Divorce' },
            { value: 'birth', label: 'Birth' },
            { value: 'adoption', label: 'Adoption' },
            { value: 'death', label: 'Death' },
            { value: 'job_change', label: 'Job Change' },
            { value: 'open_enrollment', label: 'Open Enrollment' },
            { value: 'loss_of_coverage', label: 'Loss of Coverage' },
            { value: 'other', label: 'Other' },
          ]} />
        </FormField>
        <FormField label="Event Date" required>
          <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
        </FormField>
        <FormField label="Description">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description of the life event" rows={3} />
        </FormField>
        <FormField label="Status">
          <Select value={status} onChange={e => setStatus(e.target.value)} options={[
            { value: 'pending', label: 'Pending' },
            { value: 'in_review', label: 'In Review' },
            { value: 'approved', label: 'Approved' },
            { value: 'processed', label: 'Processed' },
            { value: 'denied', label: 'Denied' },
          ]} />
        </FormField>
      </div>
    </Modal>
  )
}
