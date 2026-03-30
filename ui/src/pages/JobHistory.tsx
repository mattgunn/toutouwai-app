import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchJobHistory,
  createJobHistory,
  updateJobHistory,
  deleteJobHistory,
} from '../modules/job-history/api'
import { fetchEmployees } from '../modules/employees/api'
import { fetchDepartments } from '../modules/departments/api'
import { fetchPositions } from '../modules/positions/api'
import type { JobHistoryEntry } from '../modules/job-history/types'
import type { Employee } from '../modules/employees/types'
import type { Department } from '../modules/departments/types'
import type { Position } from '../modules/positions/types'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function JobHistory() {
  const toast = useToast()
  const [entries, setEntries] = useState<JobHistoryEntry[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<JobHistoryEntry | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [h, emp, d, p] = await Promise.all([
        fetchJobHistory(),
        fetchEmployees(),
        fetchDepartments(),
        fetchPositions(),
      ])
      setEntries(h)
      setEmployees(emp.employees)
      setDepartments(d)
      setPositions(p)
    } catch {
      toast.error('Failed to load job history')
    } finally {
      setLoading(false)
    }
  }

  const reloadEntries = () => fetchJobHistory().then(setEntries).catch(() => toast.error('Failed to reload job history'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteJobHistory(deleteConfirm.id)
      toast.success('Job history entry deleted')
      reloadEntries()
    } catch {
      toast.error('Failed to delete job history entry')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Job History" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Job History"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Entry</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'employee_name', header: 'Employee', render: (row) => {
            const entry = entries.find(e => e.id === row.id)
            return entry ? <EmployeeLink employeeId={entry.employee_id} name={entry.employee_name} /> : <span className="text-gray-400">{String(row.employee_name)}</span>
          }},
          { key: 'effective_date', header: 'Effective Date', render: (row) => <span className="text-white font-medium">{formatDate(String(row.effective_date))}</span> },
          { key: 'position_title', header: 'Position', render: (row) => <span className="text-gray-400">{String(row.position_title || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'department_name', header: 'Department', render: (row) => <span className="text-gray-400">{String(row.department_name || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'employment_type', header: 'Type', render: (row) => <span className="text-gray-400 capitalize">{String(row.employment_type || '-').replace(/_/g, ' ')}</span>, className: 'hidden lg:table-cell' },
          { key: 'reason', header: 'Reason', render: (row) => <span className="text-gray-400">{String(row.reason || '-')}</span>, className: 'hidden lg:table-cell' },
        ]}
        data={entries as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const entry = entries.find(e => e.id === row.id)
          if (entry) { setEditing(entry); setShowModal(true) }
        }}
        emptyMessage="No job history entries found"
        emptyAction="Add Entry"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <JobHistoryModal
        open={showModal}
        entry={editing}
        employees={employees}
        departments={departments}
        positions={positions}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadEntries() }}
        onDelete={(e) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: e.id, name: `${e.employee_name} - ${formatDate(e.effective_date)}` }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Job History Entry"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Job History Modal ---

function JobHistoryModal({
  open,
  entry,
  employees,
  departments,
  positions,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  entry: JobHistoryEntry | null
  employees: Employee[]
  departments: Department[]
  positions: Position[]
  onClose: () => void
  onSaved: () => void
  onDelete: (e: JobHistoryEntry) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [positionId, setPositionId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [location, setLocation] = useState('')
  const [employmentType, setEmploymentType] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(entry?.employee_id ?? '')
      setEffectiveDate(entry?.effective_date ?? '')
      setPositionId(entry?.position_id ?? '')
      setDepartmentId(entry?.department_id ?? '')
      setManagerId(entry?.manager_id ?? '')
      setLocation(entry?.location ?? '')
      setEmploymentType(entry?.employment_type ?? '')
      setReason(entry?.reason ?? '')
      setNotes(entry?.notes ?? '')
    }
  }, [open, entry])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        effective_date: effectiveDate,
        position_id: positionId || null,
        department_id: departmentId || null,
        manager_id: managerId || null,
        location: location || null,
        employment_type: employmentType || null,
        reason: reason || null,
        notes: notes || null,
      }
      if (entry) {
        await updateJobHistory(entry.id, body)
        toast.success('Job history entry updated')
      } else {
        await createJobHistory(body)
        toast.success('Job history entry created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${entry ? 'update' : 'create'} job history entry`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={entry ? 'Edit Job History' : 'Add Job History'} size="lg" footer={
      <>
        {entry && (
          <Button variant="danger" onClick={() => onDelete(entry)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !effectiveDate} loading={submitting}>
          {entry ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Employee" required>
            <Select value={employeeId} onChange={e => setEmployeeId(e.target.value)} options={[
              { value: '', label: 'Select employee' },
              ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
            ]} />
          </FormField>
          <FormField label="Effective Date" required>
            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Position">
            <Select value={positionId} onChange={e => setPositionId(e.target.value)} options={[
              { value: '', label: 'Select position' },
              ...positions.map(p => ({ value: p.id, label: p.title })),
            ]} />
          </FormField>
          <FormField label="Department">
            <Select value={departmentId} onChange={e => setDepartmentId(e.target.value)} options={[
              { value: '', label: 'Select department' },
              ...departments.map(d => ({ value: d.id, label: d.name })),
            ]} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Manager">
            <Select value={managerId} onChange={e => setManagerId(e.target.value)} options={[
              { value: '', label: 'Select manager' },
              ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
            ]} />
          </FormField>
          <FormField label="Location">
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Office location" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Employment Type">
            <Select value={employmentType} onChange={e => setEmploymentType(e.target.value)} options={[
              { value: '', label: 'Select type' },
              { value: 'full_time', label: 'Full Time' },
              { value: 'part_time', label: 'Part Time' },
              { value: 'contract', label: 'Contract' },
              { value: 'intern', label: 'Intern' },
              { value: 'temporary', label: 'Temporary' },
            ]} />
          </FormField>
          <FormField label="Reason">
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Promotion, Transfer" />
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" rows={3} />
        </FormField>
      </div>
    </Modal>
  )
}
