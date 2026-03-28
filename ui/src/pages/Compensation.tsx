import { useState, useEffect } from 'react'
import { fetchCurrentCompensation, fetchCompensation, createCompensation } from '../modules/compensation/api'
import { fetchEmployees } from '../api'
import type { CurrentCompensation, CompensationRecord } from '../modules/compensation/types'
import type { Employee } from '../types'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { PageSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'

const frequencyLabel: Record<string, string> = {
  annual: 'Annual',
  monthly: 'Monthly',
  hourly: 'Hourly',
}

const reasonLabel: Record<string, string> = {
  hire: 'New Hire',
  promotion: 'Promotion',
  merit: 'Merit Increase',
  adjustment: 'Adjustment',
  market: 'Market Adjustment',
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(amount)
}

export default function Compensation() {
  const [current, setCurrent] = useState<CurrentCompensation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [history, setHistory] = useState<CompensationRecord[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ employee_id: '', effective_date: '', salary: '', currency: 'NZD', pay_frequency: 'annual', reason: '', notes: '' })
  const toast = useToast()

  useEffect(() => {
    Promise.all([
      fetchCurrentCompensation().then(setCurrent).catch(() => {}),
      fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {}),
    ])
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedEmployee) {
      fetchCompensation({ employee_id: selectedEmployee })
        .then(setHistory)
        .catch(() => {})
    }
  }, [selectedEmployee])

  const filtered = current.filter(c => {
    const term = search.toLowerCase()
    return (
      (c.employee_name || '').toLowerCase().includes(term) ||
      (c.department_name || '').toLowerCase().includes(term) ||
      (c.position_title || '').toLowerCase().includes(term)
    )
  })

  const totalPayroll = current.reduce((sum, c) => {
    if (c.pay_frequency === 'annual') return sum + c.salary
    if (c.pay_frequency === 'monthly') return sum + c.salary * 12
    if (c.pay_frequency === 'hourly') return sum + c.salary * 2080
    return sum + c.salary
  }, 0)

  const avgSalary = current.length > 0 ? totalPayroll / current.length : 0

  const handleAdd = async () => {
    if (!form.employee_id || !form.effective_date || !form.salary) return
    setSubmitting(true)
    try {
      await createCompensation({ ...form, salary: parseFloat(form.salary) })
      setShowAdd(false)
      setForm({ employee_id: '', effective_date: '', salary: '', currency: 'NZD', pay_frequency: 'annual', reason: '', notes: '' })
      toast.success('Compensation record added')
      fetchCurrentCompensation().then(setCurrent).catch(() => toast.error('Failed to refresh data'))
      if (selectedEmployee) {
        fetchCompensation({ employee_id: selectedEmployee }).then(setHistory).catch(() => {})
      }
    } catch {
      toast.error('Failed to add compensation record')
    } finally {
      setSubmitting(false)
    }
  }

  const compColumns = [
    { key: 'employee_name', header: 'Employee', render: (comp: CurrentCompensation) => <span className="text-white">{comp.employee_name || '\u2014'}</span> },
    { key: 'department_name', header: 'Department', className: 'hidden md:table-cell', render: (comp: CurrentCompensation) => <span className="text-gray-400">{comp.department_name || '\u2014'}</span> },
    { key: 'position_title', header: 'Position', className: 'hidden lg:table-cell', render: (comp: CurrentCompensation) => <span className="text-gray-400">{comp.position_title || '\u2014'}</span> },
    { key: 'salary', header: 'Salary', render: (comp: CurrentCompensation) => <span className="text-emerald-400 font-medium">{formatCurrency(comp.salary, comp.currency)}</span> },
    { key: 'pay_frequency', header: 'Frequency', className: 'hidden md:table-cell', render: (comp: CurrentCompensation) => <span className="text-gray-400">{frequencyLabel[comp.pay_frequency] || comp.pay_frequency}</span> },
    { key: 'effective_date', header: 'Effective', className: 'hidden lg:table-cell', render: (comp: CurrentCompensation) => <span className="text-gray-500">{comp.effective_date}</span> },
    { key: 'actions', header: '', render: (comp: CurrentCompensation) => <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(comp.employee_id)}>History</Button> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Compensation" />
        <PageSkeleton />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Compensation" actions={<Button onClick={() => setShowAdd(true)}>Add Record</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Employees" value={current.length} />
        <StatCard label="Total Annual Payroll" value={formatCurrency(totalPayroll, 'NZD')} color="green" />
        <StatCard label="Average Salary" value={formatCurrency(avgSalary, 'NZD')} color="blue" />
      </div>

      {/* Add compensation modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Compensation Record"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleAdd} loading={submitting}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Employee" required>
            <Select
              value={form.employee_id}
              onChange={e => setForm({ ...form, employee_id: e.target.value })}
              placeholder="Select Employee"
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          <FormField label="Effective Date" required>
            <Input
              type="date"
              value={form.effective_date}
              onChange={e => setForm({ ...form, effective_date: e.target.value })}
            />
          </FormField>
          <FormField label="Salary" required>
            <Input
              type="number"
              value={form.salary}
              onChange={e => setForm({ ...form, salary: e.target.value })}
              placeholder="Salary"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Currency">
              <Select
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
                options={[
                  { value: 'NZD', label: 'NZD' },
                  { value: 'AUD', label: 'AUD' },
                  { value: 'USD', label: 'USD' },
                  { value: 'GBP', label: 'GBP' },
                  { value: 'EUR', label: 'EUR' },
                ]}
              />
            </FormField>
            <FormField label="Frequency">
              <Select
                value={form.pay_frequency}
                onChange={e => setForm({ ...form, pay_frequency: e.target.value })}
                options={[
                  { value: 'annual', label: 'Annual' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'hourly', label: 'Hourly' },
                ]}
              />
            </FormField>
          </div>
          <FormField label="Reason">
            <Select
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="Reason (optional)"
              options={[
                { value: 'hire', label: 'New Hire' },
                { value: 'promotion', label: 'Promotion' },
                { value: 'merit', label: 'Merit Increase' },
                { value: 'adjustment', label: 'Adjustment' },
                { value: 'market', label: 'Market Adjustment' },
              ]}
            />
          </FormField>
          <FormField label="Notes">
            <Textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes (optional)"
              rows={2}
            />
          </FormField>
        </div>
      </Modal>

      {/* History panel */}
      <Modal
        open={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        title={`Compensation History \u2014 ${history[0]?.employee_name || 'Employee'}`}
        size="lg"
      >
        {history.length === 0 ? (
          <EmptyState message="No compensation history" icon="📊" />
        ) : (
          <div className="space-y-3">
            {history.map(record => (
              <div key={record.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium">
                    {formatCurrency(record.salary, record.currency)}
                    <span className="text-gray-500 text-xs ml-1">/ {frequencyLabel[record.pay_frequency] || record.pay_frequency}</span>
                  </span>
                  <span className="text-xs text-gray-500">{record.effective_date}</span>
                </div>
                {record.reason && (
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-600/20 text-blue-400 mr-2">
                    {reasonLabel[record.reason] || record.reason}
                  </span>
                )}
                {record.notes && <p className="text-xs text-gray-500 mt-1">{record.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Modal>

      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search by name, department, or position..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <DataTable
        columns={compColumns}
        data={filtered}
        keyField="id"
        emptyMessage="No compensation records yet"
        emptyIcon="💰"
        emptyAction="Add Record"
        onEmptyAction={() => setShowAdd(true)}
      />
    </div>
  )
}
