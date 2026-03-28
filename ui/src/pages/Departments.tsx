import { useState, useEffect } from 'react'
import { fetchDepartments, createDepartment, updateDepartment, deleteDepartment, fetchEmployees } from '../api'
import type { Department, Employee } from '../types'
import EmptyState from '../components/EmptyState'
import { SkeletonCards, SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import Button from '../components/Button'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { FormField, Input, Textarea } from '../components/FormField'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import EmployeeLink from '../components/EmployeeLink'

const EMPTY_FORM = { name: '', description: '' }

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const toast = useToast()

  // Detail view state
  const [selectedDept, setSelectedDept] = useState<Department | null>(null)
  const [deptEmployees, setDeptEmployees] = useState<Employee[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const loadData = () => {
    setLoading(true)
    fetchDepartments()
      .then(setDepartments)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  // Fetch employees when a department is selected
  useEffect(() => {
    if (!selectedDept) return
    setDetailLoading(true)
    fetchEmployees({ department: selectedDept.id })
      .then(r => setDeptEmployees(r.employees))
      .catch(() => setDeptEmployees([]))
      .finally(() => setDetailLoading(false))
  }, [selectedDept])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (dept: Department) => {
    setEditing(dept)
    setForm({ name: dept.name, description: dept.description || '' })
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
      const body = { name: form.name, description: form.description || null }
      if (editing) {
        await updateDepartment(editing.id, body)
        toast.success('Department updated')
      } else {
        await createDepartment(body)
        toast.success('Department created')
      }
      closeModal()
      loadData()
    } catch {
      toast.error(editing ? 'Failed to update department' : 'Failed to create department')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteDepartment(deleteId)
      toast.success('Department deleted')
      closeModal()
      setSelectedDept(null)
      loadData()
    } catch {
      toast.error('Failed to delete department')
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  const employeeColumns = [
    { key: 'name', header: 'Name', render: (emp: Employee) => <EmployeeLink employeeId={emp.id} name={`${emp.first_name} ${emp.last_name}`} className="font-medium" /> },
    { key: 'position_title', header: 'Position', render: (emp: Employee) => <span className="text-gray-400">{emp.position_title || '\u2014'}</span>, className: 'hidden md:table-cell' },
    { key: 'email', header: 'Email', render: (emp: Employee) => <span className="text-gray-400">{emp.email}</span>, className: 'hidden lg:table-cell' },
    { key: 'status', header: 'Status', render: (emp: Employee) => <StatusBadge status={emp.status} /> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Departments" />
        <SkeletonCards count={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Departments"
        actions={<Button onClick={openCreate}>Add Department</Button>}
      />

      {departments.length === 0 ? (
        <EmptyState message="No departments yet" icon="🏢" action="Add Department" onAction={openCreate} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map(dept => (
            <div
              key={dept.id}
              onClick={() => setSelectedDept(dept)}
              className={`bg-gray-900 border rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${
                selectedDept?.id === dept.id ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-gray-800'
              }`}
            >
              <h3 className="text-white font-semibold mb-1">{dept.name}</h3>
              {dept.description && (
                <p className="text-gray-400 text-sm mb-2">{dept.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{dept.employee_count} employee{dept.employee_count !== 1 ? 's' : ''}</span>
                {dept.head_name && <span>Head: {dept.head_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selectedDept && (
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setSelectedDept(null)}>
                &larr; Back
              </Button>
              <h2 className="text-lg font-bold text-white">{selectedDept.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => openEdit(selectedDept)}>Edit</Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteId(selectedDept.id)}>Delete</Button>
            </div>
          </div>

          {selectedDept.description && (
            <p className="text-gray-400 text-sm mb-4">{selectedDept.description}</p>
          )}

          <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
            <span>{selectedDept.employee_count} employee{selectedDept.employee_count !== 1 ? 's' : ''}</span>
            {selectedDept.head_name && <span>Head: {selectedDept.head_name}</span>}
          </div>

          <h3 className="text-sm font-semibold text-gray-300 mb-3">Employees in this department</h3>
          {detailLoading ? (
            <SkeletonTable rows={3} cols={4} />
          ) : (
            <DataTable
              columns={employeeColumns}
              data={deptEmployees}
              keyField="id"
              emptyMessage="No employees in this department"
              emptyIcon="👥"
            />
          )}
        </div>
      )}

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editing ? 'Edit Department' : 'Add Department'}
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
              <Button type="submit" form="dept-form" loading={submitting}>
                {editing ? 'Save Changes' : 'Add Department'}
              </Button>
            </div>
          </div>
        }
      >
        <form id="dept-form" onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Name" required>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="Department name"
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
        title="Delete Department"
        message="Are you sure you want to delete this department? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  )
}
