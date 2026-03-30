import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchDisciplinaryActions,
  createDisciplinaryAction,
  updateDisciplinaryAction,
  deleteDisciplinaryAction,
} from '../modules/disciplinary/api'
import { fetchEmployees } from '../modules/employees/api'
import type { DisciplinaryAction } from '../modules/disciplinary/types'
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

export default function DisciplinaryActions() {
  const toast = useToast()
  const [actions, setActions] = useState<DisciplinaryAction[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<DisciplinaryAction | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [a, emp] = await Promise.all([
        fetchDisciplinaryActions(),
        fetchEmployees(),
      ])
      setActions(a)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load disciplinary actions')
    } finally {
      setLoading(false)
    }
  }

  const reloadActions = () => fetchDisciplinaryActions().then(setActions).catch(() => toast.error('Failed to reload actions'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteDisciplinaryAction(deleteConfirm.id)
      toast.success('Disciplinary action deleted')
      reloadActions()
    } catch {
      toast.error('Failed to delete disciplinary action')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const filteredActions = statusFilter === 'all'
    ? actions
    : actions.filter(a => a.status === statusFilter)

  if (loading) {
    return (
      <div>
        <PageHeader title="Disciplinary Actions" />
        <SkeletonTable rows={5} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Disciplinary Actions"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>New Action</Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'open', 'under_review', 'resolved', 'appealed', 'closed'].map(s => (
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
          { key: 'action_type', header: 'Type', render: (row) => <StatusBadge status={String(row.action_type)} /> },
          { key: 'incident_date', header: 'Incident Date', render: (row) => <span className="text-gray-400">{row.incident_date ? formatDate(String(row.incident_date)) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
        ]}
        data={filteredActions as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const action = actions.find(a => a.id === row.id)
          if (action) { setEditing(action); setShowModal(true) }
        }}
        emptyIcon="⚖️"
        emptyMessage="No disciplinary actions found"
        emptyAction="New Action"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <DisciplinaryModal
        open={showModal}
        action={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadActions() }}
        onDelete={(a) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: a.id, name: `${a.employee_name} - ${a.action_type}` }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Disciplinary Action"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Disciplinary Modal ---

function DisciplinaryModal({
  open,
  action,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  action: DisciplinaryAction | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (a: DisciplinaryAction) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [actionType, setActionType] = useState('verbal_warning')
  const [incidentDate, setIncidentDate] = useState('')
  const [status, setStatus] = useState('open')
  const [description, setDescription] = useState('')
  const [resolution, setResolution] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(action?.employee_id ?? '')
      setActionType(action?.action_type ?? 'verbal_warning')
      setIncidentDate(action?.incident_date ?? '')
      setStatus(action?.status ?? 'open')
      setDescription(action?.description ?? '')
      setResolution(action?.resolution ?? '')
    }
  }, [open, action])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        action_type: actionType,
        incident_date: incidentDate || null,
        status,
        description: description || null,
        resolution: resolution || null,
      }
      if (action) {
        await updateDisciplinaryAction(action.id, body)
        toast.success('Disciplinary action updated')
      } else {
        await createDisciplinaryAction(body)
        toast.success('Disciplinary action created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${action ? 'update' : 'create'} disciplinary action`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={action ? 'Edit Disciplinary Action' : 'New Disciplinary Action'} size="lg" footer={
      <>
        {action && (
          <Button variant="danger" onClick={() => onDelete(action)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId} loading={submitting}>
          {action ? 'Save' : 'Create'}
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
            disabled={!!action}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Action Type">
            <Select value={actionType} onChange={e => setActionType(e.target.value)} options={[
              { value: 'verbal_warning', label: 'Verbal Warning' },
              { value: 'written_warning', label: 'Written Warning' },
              { value: 'final_warning', label: 'Final Warning' },
              { value: 'suspension', label: 'Suspension' },
              { value: 'termination', label: 'Termination' },
              { value: 'pip', label: 'Performance Improvement Plan' },
            ]} />
          </FormField>
          <FormField label="Incident Date">
            <Input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Status">
          <Select value={status} onChange={e => setStatus(e.target.value)} options={[
            { value: 'open', label: 'Open' },
            { value: 'under_review', label: 'Under Review' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'appealed', label: 'Appealed' },
            { value: 'closed', label: 'Closed' },
          ]} />
        </FormField>
        <FormField label="Description">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the incident" rows={4} />
        </FormField>
        <FormField label="Resolution">
          <Textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Resolution details" rows={3} />
        </FormField>
      </div>
    </Modal>
  )
}
