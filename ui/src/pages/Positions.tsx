import { useState, useEffect } from 'react'
import { fetchPositions, fetchDepartments, createPosition, updatePosition, deletePosition, fetchEmployees, updateEmployee } from '../api'
import type { Position, Department, Employee } from '../types'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import EmployeeLink from '../components/EmployeeLink'

const EMPTY_FORM = { title: '', department_id: '', level: '', description: '' }

export default function Positions() {
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [allEmployees, setAllEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  // Detail view state
  const [selectedPos, setSelectedPos] = useState<Position | null>(null)
  const [posEmployees, setPosEmployees] = useState<Employee[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Assign employee state
  const [showAssign, setShowAssign] = useState(false)
  const [assignEmployeeId, setAssignEmployeeId] = useState('')
  const [assigning, setAssigning] = useState(false)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetchPositions().then(setPositions),
      fetchDepartments().then(setDepartments),
      fetchEmployees({ per_page: '1000' }).then(r => setAllEmployees(r.employees)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  // Filter employees for selected position from already-loaded data
  useEffect(() => {
    if (!selectedPos) return
    setDetailLoading(true)
    const filtered = allEmployees.filter(emp => emp.position_id === selectedPos.id)
    setPosEmployees(filtered)
    setDetailLoading(false)
  }, [selectedPos, allEmployees])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (pos: Position) => {
    setEditing(pos)
    setForm({
      title: pos.title,
      department_id: pos.department_id || '',
      level: pos.level || '',
      description: pos.description || '',
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const body = {
        title: form.title,
        department_id: form.department_id || null,
        level: form.level || null,
        description: form.description || null,
      }
      if (editing) {
        await updatePosition(editing.id, body)
        toast.success('Position updated')
      } else {
        await createPosition(body)
        toast.success('Position created')
      }
      closeModal()
      loadData()
    } catch {
      toast.error(editing ? 'Failed to update position' : 'Failed to create position')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deletePosition(deleteId)
      toast.success('Position deleted')
      closeModal()
      setSelectedPos(null)
      loadData()
    } catch {
      toast.error('Failed to delete position')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const handleAssignEmployee = async () => {
    if (!assignEmployeeId || !selectedPos) return
    setAssigning(true)
    try {
      await updateEmployee(assignEmployeeId, { position_id: selectedPos.id })
      toast.success('Employee assigned to position')
      setShowAssign(false)
      setAssignEmployeeId('')
      // Refresh data
      const empRes = await fetchEmployees({ per_page: '1000' })
      setAllEmployees(empRes.employees)
      fetchPositions().then(setPositions).catch(() => {})
    } catch {
      toast.error('Failed to assign employee')
    } finally {
      setAssigning(false)
    }
  }

  // Employees not already in this position (for assign dropdown)
  const unassignedEmployees = allEmployees.filter(emp => !selectedPos || emp.position_id !== selectedPos.id)

  const columns = [
    { key: 'title', header: 'Title', render: (pos: Position) => <span className="text-white font-medium">{pos.title}</span> },
    { key: 'department_name', header: 'Department', className: 'hidden md:table-cell', render: (pos: Position) => <span className="text-gray-400">{pos.department_name || '\u2014'}</span> },
    { key: 'level', header: 'Level', className: 'hidden lg:table-cell', render: (pos: Position) => <span className="text-gray-400">{pos.level || '\u2014'}</span> },
    { key: 'employee_count', header: 'Employees', render: (pos: Position) => (
      <span className="text-gray-400">
        {pos.employee_count}
        {pos.employee_count === 0 && (
          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-amber-600/20 text-amber-400">Vacant</span>
        )}
      </span>
    )},
  ]

  const employeeColumns = [
    { key: 'name', header: 'Name', render: (emp: Employee) => <EmployeeLink employeeId={emp.id} name={`${emp.first_name} ${emp.last_name}`} className="font-medium" /> },
    { key: 'department_name', header: 'Department', render: (emp: Employee) => <span className="text-gray-400">{emp.department_name || '\u2014'}</span>, className: 'hidden md:table-cell' },
    { key: 'email', header: 'Email', render: (emp: Employee) => <span className="text-gray-400">{emp.email}</span>, className: 'hidden lg:table-cell' },
    { key: 'status', header: 'Status', render: (emp: Employee) => <StatusBadge status={emp.status} /> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Positions" />
        <SkeletonTable rows={6} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Positions"
        actions={<Button onClick={openCreate}>Add Position</Button>}
      />

      <DataTable
        columns={columns}
        data={positions}
        keyField="id"
        emptyIcon="💼"
        emptyMessage="No positions yet"
        onRowClick={(pos) => setSelectedPos(pos)}
        striped
      />

      {/* Detail panel */}
      {selectedPos && (
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedPos(null)}>
                &larr; Back
              </Button>
              <h2 className="text-lg font-bold text-white">{selectedPos.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setShowAssign(true)}>Assign Employee</Button>
              <Button size="sm" onClick={() => openEdit(selectedPos)}>Edit</Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteId(selectedPos.id)}>Delete</Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 mb-4">
            {selectedPos.department_name && (
              <span>Department: <span className="text-white">{selectedPos.department_name}</span></span>
            )}
            {selectedPos.level && (
              <span>Level: <span className="text-white">{selectedPos.level}</span></span>
            )}
            <span>Employees: <span className="text-white">{selectedPos.employee_count}</span></span>
          </div>

          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-gray-400 text-sm">{selectedPos.description || <span className="italic text-gray-600">No description</span>}</p>
          </div>

          <h3 className="text-sm font-semibold text-gray-300 mb-3">Employees in this position</h3>
          {detailLoading ? (
            <SkeletonTable rows={3} cols={4} />
          ) : (
            <DataTable
              columns={employeeColumns}
              data={posEmployees}
              keyField="id"
              emptyMessage="No employees in this position"
              emptyIcon="👥"
            />
          )}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editing ? 'Edit Position' : 'Add Position'}
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {editing && (
                <Button variant="danger" size="sm" onClick={() => setDeleteId(editing.id)} disabled={submitting}>
                  Delete
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={closeModal} disabled={submitting}>Cancel</Button>
              <Button type="submit" form="pos-form" loading={submitting}>
                {editing ? 'Save Changes' : 'Add Position'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="pos-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Title" required>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              placeholder="Position title"
            />
          </FormField>
          <FormField label="Department">
            <Select
              value={form.department_id}
              onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
              placeholder="Select department"
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />
          </FormField>
          <FormField label="Level">
            <Input
              value={form.level}
              onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
              placeholder="e.g. Senior, Junior, Lead"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description"
            />
          </FormField>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Position"
        message="Are you sure you want to delete this position? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />

      {/* Assign employee modal */}
      <Modal
        open={showAssign}
        onClose={() => { setShowAssign(false); setAssignEmployeeId('') }}
        title={`Assign Employee to ${selectedPos?.title || 'Position'}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowAssign(false); setAssignEmployeeId('') }} disabled={assigning}>Cancel</Button>
            <Button onClick={handleAssignEmployee} loading={assigning} disabled={!assignEmployeeId}>Assign</Button>
          </>
        }
      >
        <FormField label="Employee" required>
          <Select
            value={assignEmployeeId}
            onChange={e => setAssignEmployeeId(e.target.value)}
            placeholder="Select employee"
            options={unassignedEmployees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
          />
        </FormField>
      </Modal>
    </div>
  )
}
