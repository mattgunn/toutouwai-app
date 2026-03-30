import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchDependents,
  createDependent,
  updateDependent,
  deleteDependent,
} from '../modules/dependents/api'
import { fetchEmployees } from '../modules/employees/api'
import type { Dependent } from '../modules/dependents/types'
import type { Employee } from '../modules/employees/types'
import StatusBadge from '../components/StatusBadge'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function Dependents() {
  const toast = useToast()
  const [dependents, setDependents] = useState<Dependent[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Dependent | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [d, emp] = await Promise.all([
        fetchDependents(),
        fetchEmployees(),
      ])
      setDependents(d)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load dependents')
    } finally {
      setLoading(false)
    }
  }

  const reloadDependents = () => fetchDependents().then(setDependents).catch(() => toast.error('Failed to reload dependents'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteDependent(deleteConfirm.id)
      toast.success('Dependent deleted')
      reloadDependents()
    } catch {
      toast.error('Failed to delete dependent')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Dependents" />
        <SkeletonTable rows={5} cols={7} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Dependents"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Dependent</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'employee_name', header: 'Employee', render: (row) => {
            const dep = dependents.find(d => d.id === row.id)
            return dep ? <EmployeeLink employeeId={dep.employee_id} name={dep.employee_name} /> : <span className="text-gray-400">{String(row.employee_name)}</span>
          }},
          { key: 'first_name', header: 'First Name', render: (row) => <span className="text-white font-medium">{String(row.first_name)}</span> },
          { key: 'last_name', header: 'Last Name', render: (row) => <span className="text-gray-400">{String(row.last_name)}</span> },
          { key: 'relationship', header: 'Relationship', render: (row) => <span className="text-gray-400 capitalize">{String(row.relationship || '-').replace(/_/g, ' ')}</span>, className: 'hidden md:table-cell' },
          { key: 'date_of_birth', header: 'Date of Birth', render: (row) => <span className="text-gray-400">{row.date_of_birth ? formatDate(String(row.date_of_birth)) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'gender', header: 'Gender', render: (row) => <span className="text-gray-400 capitalize">{String(row.gender || '-')}</span>, className: 'hidden lg:table-cell' },
          { key: 'is_active', header: 'Active', render: (row) => <StatusBadge status={Number(row.is_active) ? 'active' : 'inactive'} /> },
        ]}
        data={dependents as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const dep = dependents.find(d => d.id === row.id)
          if (dep) { setEditing(dep); setShowModal(true) }
        }}
        emptyMessage="No dependents found"
        emptyAction="Add Dependent"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <DependentModal
        open={showModal}
        dependent={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadDependents() }}
        onDelete={(d) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: d.id, name: `${d.first_name} ${d.last_name}` }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Dependent"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Dependent Modal ---

function DependentModal({
  open,
  dependent,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  dependent: Dependent | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (d: Dependent) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [relationship, setRelationship] = useState('child')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('')
  const [isActive, setIsActive] = useState('1')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(dependent?.employee_id ?? '')
      setFirstName(dependent?.first_name ?? '')
      setLastName(dependent?.last_name ?? '')
      setRelationship(dependent?.relationship ?? 'child')
      setDateOfBirth(dependent?.date_of_birth ?? '')
      setGender(dependent?.gender ?? '')
      setIsActive(dependent ? String(dependent.is_active) : '1')
    }
  }, [open, dependent])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        first_name: firstName,
        last_name: lastName,
        relationship,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        is_active: parseInt(isActive),
      }
      if (dependent) {
        await updateDependent(dependent.id, body)
        toast.success('Dependent updated')
      } else {
        await createDependent(body)
        toast.success('Dependent created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${dependent ? 'update' : 'create'} dependent`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={dependent ? 'Edit Dependent' : 'Add Dependent'} size="lg" footer={
      <>
        {dependent && (
          <Button variant="danger" onClick={() => onDelete(dependent)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !firstName || !lastName} loading={submitting}>
          {dependent ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Employee" required>
          <Select value={employeeId} onChange={e => setEmployeeId(e.target.value)} options={[
            { value: '', label: 'Select employee' },
            ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
          ]} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="First Name" required>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" />
          </FormField>
          <FormField label="Last Name" required>
            <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Relationship">
            <Select value={relationship} onChange={e => setRelationship(e.target.value)} options={[
              { value: 'spouse', label: 'Spouse' },
              { value: 'child', label: 'Child' },
              { value: 'domestic_partner', label: 'Domestic Partner' },
              { value: 'other', label: 'Other' },
            ]} />
          </FormField>
          <FormField label="Date of Birth">
            <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Gender">
            <Select value={gender} onChange={e => setGender(e.target.value)} options={[
              { value: '', label: 'Select gender' },
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]} />
          </FormField>
          <FormField label="Active">
            <Select value={isActive} onChange={e => setIsActive(e.target.value)} options={[
              { value: '1', label: 'Yes' },
              { value: '0', label: 'No' },
            ]} />
          </FormField>
        </div>
      </div>
    </Modal>
  )
}
