import { useState, useEffect } from 'react'
import { fetchEmployees, fetchDepartments, fetchPositions, createEmployee, updateEmployee } from '../api'
import type { Employee, Department, Position } from '../types'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import { Input, Select, FormField } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { useToast } from '../components/Toast'
import { formatDate } from '../utils/format'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'on_leave', label: 'On Leave' },
]

const EMPTY_FORM = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  department_id: '',
  position_id: '',
  start_date: '',
  status: 'active',
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetchEmployees().then(r => setEmployees(r.employees)),
      fetchDepartments().then(setDepartments),
      fetchPositions().then(setPositions),
    ])
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const openEdit = (emp: Employee) => {
    setEditing(emp)
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      phone: emp.phone || '',
      department_id: emp.department_id || '',
      position_id: emp.position_id || '',
      start_date: emp.start_date || '',
      status: emp.status,
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
        ...form,
        department_id: form.department_id || null,
        position_id: form.position_id || null,
        phone: form.phone || null,
        start_date: form.start_date || null,
      }
      if (editing) {
        await updateEmployee(editing.id, body)
        toast.success('Employee updated')
      } else {
        await createEmployee(body)
        toast.success('Employee created')
      }
      closeModal()
      loadData()
    } catch {
      toast.error(editing ? 'Failed to update employee' : 'Failed to create employee')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = employees.filter(e => {
    const term = search.toLowerCase()
    return (
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(term) ||
      e.email.toLowerCase().includes(term) ||
      (e.department_name || '').toLowerCase().includes(term)
    )
  })

  const columns = [
    {
      key: 'last_name',
      header: 'Name',
      sortable: true,
      render: (emp: Employee) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${emp.first_name} ${emp.last_name}`} imageUrl={emp.avatar_url} size="md" />
          <span className="text-white font-medium">{emp.first_name} {emp.last_name}</span>
        </div>
      ),
    },
    { key: 'email', header: 'Email', sortable: true, render: (emp: Employee) => <span className="text-gray-400">{emp.email}</span> },
    { key: 'department_name', header: 'Department', sortable: true, className: 'hidden md:table-cell', render: (emp: Employee) => <span className="text-gray-400">{emp.department_name || '\u2014'}</span> },
    { key: 'position_title', header: 'Position', sortable: true, className: 'hidden lg:table-cell', render: (emp: Employee) => <span className="text-gray-400">{emp.position_title || '\u2014'}</span> },
    { key: 'start_date', header: 'Start Date', className: 'hidden lg:table-cell', render: (emp: Employee) => <span className="text-gray-400">{formatDate(emp.start_date)}</span> },
    { key: 'status', header: 'Status', render: (emp: Employee) => <StatusBadge status={emp.status} /> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Employee Directory" subtitle="Manage your workforce" />
        <SkeletonTable rows={8} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Employee Directory"
        subtitle="Manage your workforce"
        actions={
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={openCreate}>Add Employee</Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        emptyIcon="👥"
        emptyMessage="No employees found"
        onRowClick={openEdit}
        striped
      />

      <Modal
        open={showModal}
        onClose={closeModal}
        title={editing ? 'Edit Employee' : 'Add Employee'}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>Cancel</Button>
            <Button type="submit" form="employee-form" loading={submitting}>
              {editing ? 'Save Changes' : 'Add Employee'}
            </Button>
          </>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="First Name" required>
            <Input
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              required
              placeholder="First name"
            />
          </FormField>
          <FormField label="Last Name" required>
            <Input
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              required
              placeholder="Last name"
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              placeholder="email@company.com"
            />
          </FormField>
          <FormField label="Phone">
            <Input
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Phone number"
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
          <FormField label="Position">
            <Select
              value={form.position_id}
              onChange={e => setForm(f => ({ ...f, position_id: e.target.value }))}
              placeholder="Select position"
              options={positions.map(p => ({ value: p.id, label: p.title }))}
            />
          </FormField>
          <FormField label="Start Date">
            <Input
              type="date"
              value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
            />
          </FormField>
          <FormField label="Status">
            <Select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              options={STATUS_OPTIONS}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  )
}
