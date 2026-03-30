import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchGrievances,
  createGrievance,
  updateGrievance,
  deleteGrievance,
} from '../modules/grievances/api'
import { fetchEmployees } from '../modules/employees/api'
import type { Grievance } from '../modules/grievances/types'
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

export default function Grievances() {
  const toast = useToast()
  const [grievances, setGrievances] = useState<Grievance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Grievance | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [g, emp] = await Promise.all([
        fetchGrievances(),
        fetchEmployees(),
      ])
      setGrievances(g)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load grievances')
    } finally {
      setLoading(false)
    }
  }

  const reloadGrievances = () => fetchGrievances().then(setGrievances).catch(() => toast.error('Failed to reload grievances'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteGrievance(deleteConfirm.id)
      toast.success('Grievance deleted')
      reloadGrievances()
    } catch {
      toast.error('Failed to delete grievance')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const filteredGrievances = grievances
    .filter(g => statusFilter === 'all' || g.status === statusFilter)
    .filter(g => priorityFilter === 'all' || g.priority === priorityFilter)

  if (loading) {
    return (
      <div>
        <PageHeader title="Grievances" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Grievances"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>File Grievance</Button>
        }
      />

      <div className="flex gap-4 mb-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <span className="text-gray-500 text-xs self-center">Status:</span>
          {['all', 'submitted', 'investigating', 'resolved', 'dismissed', 'escalated'].map(s => (
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
        <div className="flex gap-2 flex-wrap">
          <span className="text-gray-500 text-xs self-center">Priority:</span>
          {['all', 'low', 'medium', 'high', 'critical'].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                priorityFilter === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {p === 'all' ? 'All' : p.replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={[
          { key: 'employee_name', header: 'Employee', render: (row) => <EmployeeLink employeeId={String(row.employee_id)} name={String(row.employee_name)} /> },
          { key: 'subject', header: 'Subject', render: (row) => <span className="text-white font-medium">{String(row.subject)}</span> },
          { key: 'category', header: 'Category', render: (row) => <span className="text-gray-400 capitalize">{String(row.category || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'priority', header: 'Priority', render: (row) => <StatusBadge status={String(row.priority)} /> },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          { key: 'filed_date', header: 'Filed', render: (row) => <span className="text-gray-400">{row.filed_date ? formatDate(String(row.filed_date)) : '-'}</span>, className: 'hidden lg:table-cell' },
        ]}
        data={filteredGrievances as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const g = grievances.find(gr => gr.id === row.id)
          if (g) { setEditing(g); setShowModal(true) }
        }}
        emptyIcon="📋"
        emptyMessage="No grievances found"
        emptyAction="File Grievance"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <GrievanceModal
        open={showModal}
        grievance={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadGrievances() }}
        onDelete={(g) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: g.id, name: g.subject }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Grievance"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Grievance Modal ---

function GrievanceModal({
  open,
  grievance,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  grievance: Grievance | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (g: Grievance) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('workplace')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('submitted')
  const [filedDate, setFiledDate] = useState('')
  const [description, setDescription] = useState('')
  const [resolution, setResolution] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(grievance?.employee_id ?? '')
      setSubject(grievance?.subject ?? '')
      setCategory(grievance?.category ?? 'workplace')
      setPriority(grievance?.priority ?? 'medium')
      setStatus(grievance?.status ?? 'submitted')
      setFiledDate(grievance?.filed_date ?? '')
      setDescription(grievance?.description ?? '')
      setResolution(grievance?.resolution ?? '')
    }
  }, [open, grievance])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        subject,
        category,
        priority,
        status,
        filed_date: filedDate || null,
        description: description || null,
        resolution: resolution || null,
      }
      if (grievance) {
        await updateGrievance(grievance.id, body)
        toast.success('Grievance updated')
      } else {
        await createGrievance(body)
        toast.success('Grievance filed')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${grievance ? 'update' : 'file'} grievance`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={grievance ? 'Edit Grievance' : 'File Grievance'} size="lg" footer={
      <>
        {grievance && (
          <Button variant="danger" onClick={() => onDelete(grievance)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !subject || !description} loading={submitting}>
          {grievance ? 'Save' : 'File'}
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
            disabled={!!grievance}
          />
        </FormField>
        <FormField label="Subject" required>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief description of grievance" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category">
            <Select value={category} onChange={e => setCategory(e.target.value)} options={[
              { value: 'workplace', label: 'Workplace' },
              { value: 'harassment', label: 'Harassment' },
              { value: 'discrimination', label: 'Discrimination' },
              { value: 'compensation', label: 'Compensation' },
              { value: 'safety', label: 'Safety' },
              { value: 'policy', label: 'Policy' },
              { value: 'management', label: 'Management' },
              { value: 'other', label: 'Other' },
            ]} />
          </FormField>
          <FormField label="Priority">
            <Select value={priority} onChange={e => setPriority(e.target.value)} options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)} options={[
              { value: 'submitted', label: 'Submitted' },
              { value: 'investigating', label: 'Investigating' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'dismissed', label: 'Dismissed' },
              { value: 'escalated', label: 'Escalated' },
            ]} />
          </FormField>
          <FormField label="Filed Date">
            <Input type="date" value={filedDate} onChange={e => setFiledDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Description">
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed description of the grievance" rows={4} />
        </FormField>
        <FormField label="Resolution">
          <Textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Resolution details" rows={3} />
        </FormField>
      </div>
    </Modal>
  )
}
