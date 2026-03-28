import { useState, useEffect } from 'react'
import { fetchEmployees, fetchDepartments, fetchPositions, createEmployee, updateEmployee, fetchDocuments, fetchLeaveRequests, fetchTimeEntries } from '../api'
import { fetchCompensation } from '../modules/compensation/api'
import type { Employee, Department, Position, LeaveRequest, TimeEntry } from '../types'
import type { CompensationRecord } from '../modules/compensation/types'
import type { Document } from '../modules/documents/types'
import { fetchGoals } from '../api'
import type { Goal } from '../types'
import StatusBadge from '../components/StatusBadge'
import Avatar from '../components/Avatar'
import { Input, Select, FormField } from '../components/FormField'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
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

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(amount)
}

function EmployeeDetail({
  employee,
  onBack,
  onEdit,
}: {
  employee: Employee
  onBack: () => void
  onEdit: (emp: Employee) => void
}) {
  const [activeTab, setActiveTab] = useState('compensation')
  const [compensation, setCompensation] = useState<CompensationRecord[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  useEffect(() => {
    setTabLoading(true)
    if (activeTab === 'compensation') {
      fetchCompensation({ employee_id: employee.id }).then(setCompensation).catch(() => {}).finally(() => setTabLoading(false))
    } else if (activeTab === 'leave') {
      fetchLeaveRequests().then(all => setLeaveRequests(all.filter(r => r.employee_id === employee.id))).catch(() => {}).finally(() => setTabLoading(false))
    } else if (activeTab === 'time') {
      fetchTimeEntries({ employee_id: employee.id } as Record<string, string>).then(setTimeEntries).catch(() => {}).finally(() => setTabLoading(false))
    } else if (activeTab === 'documents') {
      fetchDocuments({ employee_id: employee.id }).then(setDocuments).catch(() => {}).finally(() => setTabLoading(false))
    } else if (activeTab === 'goals') {
      fetchGoals().then(all => setGoals(all.filter(g => g.employee_id === employee.id))).catch(() => {}).finally(() => setTabLoading(false))
    }
  }, [activeTab, employee.id])

  const fullName = `${employee.first_name} ${employee.last_name}`

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        &larr; Back to Directory
      </Button>

      {/* Header card */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-start gap-6">
          <Avatar name={fullName} imageUrl={employee.avatar_url} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl font-semibold text-white">{fullName}</h2>
                <p className="text-sm text-gray-400">{employee.position_title || 'No position'} {employee.department_name ? `\u00B7 ${employee.department_name}` : ''}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={employee.status} />
                <Button size="sm" onClick={() => onEdit(employee)}>Edit</Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Email</p>
                <p className="text-sm text-gray-300">{employee.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <p className="text-sm text-gray-300">{employee.phone || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Manager</p>
                <p className="text-sm text-gray-300">{employee.manager_name || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Start Date</p>
                <p className="text-sm text-gray-300">{formatDate(employee.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Address</p>
                <p className="text-sm text-gray-300">{employee.address || '\u2014'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Emergency Contact</p>
                <p className="text-sm text-gray-300">{employee.emergency_contact || '\u2014'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'compensation', label: 'Compensation' },
            { key: 'leave', label: 'Leave Requests' },
            { key: 'time', label: 'Time Entries' },
            { key: 'documents', label: 'Documents' },
            { key: 'goals', label: 'Goals' },
          ]}
          active={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {/* Tab content */}
      {tabLoading ? (
        <SkeletonTable rows={3} cols={4} />
      ) : (
        <>
          {activeTab === 'compensation' && (
            compensation.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No compensation records</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'effective_date', header: 'Effective Date', render: (r: CompensationRecord) => <span className="text-gray-400">{formatDate(r.effective_date)}</span> },
                  { key: 'salary', header: 'Salary', render: (r: CompensationRecord) => <span className="text-emerald-400 font-medium">{formatCurrency(r.salary, r.currency)}</span> },
                  { key: 'pay_frequency', header: 'Frequency', render: (r: CompensationRecord) => <span className="text-gray-400 capitalize">{r.pay_frequency}</span> },
                  { key: 'reason', header: 'Reason', render: (r: CompensationRecord) => <span className="text-gray-400 capitalize">{r.reason || '\u2014'}</span> },
                ]}
                data={compensation}
                keyField="id"
              />
            )
          )}
          {activeTab === 'leave' && (
            leaveRequests.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No leave requests</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'leave_type_name', header: 'Type', render: (r: LeaveRequest) => <span className="text-gray-300">{r.leave_type_name || '\u2014'}</span> },
                  { key: 'start_date', header: 'Start', render: (r: LeaveRequest) => <span className="text-gray-400">{formatDate(r.start_date)}</span> },
                  { key: 'end_date', header: 'End', render: (r: LeaveRequest) => <span className="text-gray-400">{formatDate(r.end_date)}</span> },
                  { key: 'days', header: 'Days', render: (r: LeaveRequest) => <span className="text-white">{r.days}</span> },
                  { key: 'status', header: 'Status', render: (r: LeaveRequest) => <StatusBadge status={r.status} /> },
                ]}
                data={leaveRequests}
                keyField="id"
              />
            )
          )}
          {activeTab === 'time' && (
            timeEntries.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No time entries</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'date', header: 'Date', render: (r: TimeEntry) => <span className="text-gray-400">{formatDate(r.date)}</span> },
                  { key: 'hours', header: 'Hours', render: (r: TimeEntry) => <span className="text-white font-medium">{r.hours}h</span> },
                  { key: 'project', header: 'Project', render: (r: TimeEntry) => <span className="text-gray-400">{r.project || '\u2014'}</span> },
                  { key: 'description', header: 'Description', render: (r: TimeEntry) => <span className="text-gray-400">{r.description || '\u2014'}</span> },
                ]}
                data={timeEntries}
                keyField="id"
              />
            )
          )}
          {activeTab === 'documents' && (
            documents.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No documents</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'name', header: 'Name', render: (r: Document) => <span className="text-white">{r.name}</span> },
                  { key: 'category', header: 'Category', render: (r: Document) => <span className="text-gray-400 capitalize">{r.category}</span> },
                  { key: 'expiry_date', header: 'Expiry', render: (r: Document) => <span className="text-gray-400">{r.expiry_date ? formatDate(r.expiry_date) : '\u2014'}</span> },
                  { key: 'created_at', header: 'Created', render: (r: Document) => <span className="text-gray-400">{formatDate(r.created_at)}</span> },
                ]}
                data={documents}
                keyField="id"
              />
            )
          )}
          {activeTab === 'goals' && (
            goals.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center">No goals</p>
            ) : (
              <DataTable
                columns={[
                  { key: 'title', header: 'Goal', render: (g: Goal) => <span className="text-white">{g.title}</span> },
                  { key: 'progress', header: 'Progress', render: (g: Goal) => (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-2 min-w-[60px]">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${g.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-8">{g.progress}%</span>
                    </div>
                  )},
                  { key: 'due_date', header: 'Due', render: (g: Goal) => <span className="text-gray-400">{formatDate(g.due_date)}</span> },
                  { key: 'status', header: 'Status', render: (g: Goal) => <StatusBadge status={g.status} /> },
                ]}
                data={goals}
                keyField="id"
              />
            )
          )}
        </>
      )}
    </div>
  )
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
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
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

  // Detail view
  if (selectedEmployee) {
    return (
      <EmployeeDetail
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
        onEdit={(emp) => {
          openEdit(emp)
        }}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Employee Directory"
        subtitle="Manage your workforce"
        actions={<Button onClick={openCreate}>Add Employee</Button>}
      />

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search by name, email, department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        emptyIcon="👥"
        emptyMessage="No employees found"
        onRowClick={(emp) => setSelectedEmployee(emp)}
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
