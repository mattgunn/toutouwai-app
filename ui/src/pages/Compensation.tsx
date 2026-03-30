import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import { fetchCurrentCompensation, fetchCompensation, createCompensation, updateCompensation, fetchSalaryBands, createSalaryBand, updateSalaryBand, deleteSalaryBand } from '../modules/compensation/api'
import { fetchEmployees, fetchPositions } from '../api'
import type { CurrentCompensation, CompensationRecord, SalaryBand } from '../modules/compensation/types'
import type { Employee, Position } from '../types'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { PageSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import EmployeeLink from '../components/EmployeeLink'

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

type CompTab = 'employees' | 'bands'

export default function Compensation() {
  const [tab, setTab] = useState<CompTab>('employees')
  const [current, setCurrent] = useState<CurrentCompensation[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [bands, setBands] = useState<SalaryBand[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<CurrentCompensation | null>(null)
  const [history, setHistory] = useState<CompensationRecord[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ employee_id: '', effective_date: '', salary: '', currency: 'NZD', pay_frequency: 'annual', reason: '', notes: '' })
  const [editingRecord, setEditingRecord] = useState<CompensationRecord | null>(null)
  const [editForm, setEditForm] = useState({ effective_date: '', salary: '', currency: 'NZD', pay_frequency: 'annual', reason: '', notes: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Band form state
  const [showBandForm, setShowBandForm] = useState(false)
  const [bandSubmitting, setBandSubmitting] = useState(false)
  const [bandForm, setBandForm] = useState({ name: '', grade: '', position_id: '', min_salary: '', mid_salary: '', max_salary: '', currency: 'NZD' })
  const [editingBand, setEditingBand] = useState<SalaryBand | null>(null)

  const toast = useToast()

  useEffect(() => {
    Promise.all([
      fetchCurrentCompensation().then(setCurrent).catch(() => toast.error('Failed to load compensation data')),
      fetchEmployees().then(r => setEmployees(r.employees)).catch(() => toast.error('Failed to load employees')),
      fetchSalaryBands().then(setBands).catch(() => toast.error('Failed to load salary bands')),
      fetchPositions().then(setPositions).catch(() => toast.error('Failed to load positions')),
    ])
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedEmployee) {
      fetchCompensation({ employee_id: selectedEmployee.employee_id })
        .then(setHistory)
        .catch(() => toast.error('Failed to load compensation history'))
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
        fetchCompensation({ employee_id: selectedEmployee.employee_id }).then(setHistory).catch(() => toast.error('Failed to refresh history'))
      }
    } catch {
      toast.error('Failed to add compensation record')
    } finally {
      setSubmitting(false)
    }
  }

  const openAddForEmployee = () => {
    if (selectedEmployee) {
      setForm({ employee_id: selectedEmployee.employee_id, effective_date: '', salary: '', currency: selectedEmployee.currency || 'NZD', pay_frequency: selectedEmployee.pay_frequency || 'annual', reason: '', notes: '' })
      setShowAdd(true)
    }
  }

  const openEditRecord = (record: CompensationRecord) => {
    setEditingRecord(record)
    setEditForm({
      effective_date: record.effective_date,
      salary: String(record.salary),
      currency: record.currency,
      pay_frequency: record.pay_frequency,
      reason: record.reason || '',
      notes: record.notes || '',
    })
  }

  const handleEditRecord = async () => {
    if (!editingRecord || !editForm.salary || !editForm.effective_date) return
    setEditSubmitting(true)
    try {
      await updateCompensation(editingRecord.id, { ...editForm, salary: parseFloat(editForm.salary) })
      toast.success('Compensation record updated')
      setEditingRecord(null)
      fetchCurrentCompensation().then(setCurrent).catch(() => toast.error('Failed to refresh data'))
      if (selectedEmployee) {
        fetchCompensation({ employee_id: selectedEmployee.employee_id }).then(setHistory).catch(() => toast.error('Failed to refresh history'))
      }
    } catch {
      toast.error('Failed to update compensation record')
    } finally {
      setEditSubmitting(false)
    }
  }

  // Band handlers
  const openAddBand = () => {
    setEditingBand(null)
    setBandForm({ name: '', grade: '', position_id: '', min_salary: '', mid_salary: '', max_salary: '', currency: 'NZD' })
    setShowBandForm(true)
  }

  const openEditBand = (band: SalaryBand) => {
    setEditingBand(band)
    setBandForm({
      name: band.name,
      grade: band.grade,
      position_id: band.position_id || '',
      min_salary: String(band.min_salary),
      mid_salary: String(band.mid_salary),
      max_salary: String(band.max_salary),
      currency: band.currency,
    })
    setShowBandForm(true)
  }

  const handleSaveBand = async () => {
    if (!bandForm.name || !bandForm.grade || !bandForm.min_salary || !bandForm.mid_salary || !bandForm.max_salary) return
    setBandSubmitting(true)
    try {
      const payload = {
        ...bandForm,
        position_id: bandForm.position_id || null,
        min_salary: parseFloat(bandForm.min_salary),
        mid_salary: parseFloat(bandForm.mid_salary),
        max_salary: parseFloat(bandForm.max_salary),
      }
      if (editingBand) {
        await updateSalaryBand(editingBand.id, payload)
        toast.success('Salary band updated')
      } else {
        await createSalaryBand(payload)
        toast.success('Salary band created')
      }
      setShowBandForm(false)
      fetchSalaryBands().then(setBands).catch(() => toast.error('Failed to refresh bands'))
    } catch {
      toast.error('Failed to save salary band')
    } finally {
      setBandSubmitting(false)
    }
  }

  const handleDeleteBand = async (band: SalaryBand) => {
    try {
      await deleteSalaryBand(band.id)
      toast.success('Salary band deleted')
      setBands(prev => prev.filter(b => b.id !== band.id))
    } catch {
      toast.error('Failed to delete salary band')
    }
  }

  // Find matching band for employee's position
  const findBandForPosition = (positionTitle: string | null) => {
    if (!positionTitle) return null
    return bands.find(b => b.position_title === positionTitle)
  }

  const compColumns = [
    { key: 'employee_name', header: 'Employee', render: (comp: CurrentCompensation) => comp.employee_id ? <EmployeeLink employeeId={comp.employee_id} name={comp.employee_name || 'Unknown'} /> : <span className="text-white">{'\u2014'}</span> },
    { key: 'department_name', header: 'Department', className: 'hidden md:table-cell', render: (comp: CurrentCompensation) => <span className="text-gray-400">{comp.department_name || '\u2014'}</span> },
    { key: 'position_title', header: 'Position', className: 'hidden lg:table-cell', render: (comp: CurrentCompensation) => <span className="text-gray-400">{comp.position_title || '\u2014'}</span> },
    { key: 'salary', header: 'Salary', render: (comp: CurrentCompensation) => <span className="text-emerald-400 font-medium">{formatCurrency(comp.salary, comp.currency)}</span> },
    { key: 'pay_frequency', header: 'Frequency', className: 'hidden md:table-cell', render: (comp: CurrentCompensation) => <span className="text-gray-400">{frequencyLabel[comp.pay_frequency] || comp.pay_frequency}</span> },
    { key: 'effective_date', header: 'Effective', className: 'hidden lg:table-cell', render: (comp: CurrentCompensation) => <span className="text-gray-400">{formatDate(comp.effective_date)}</span> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Compensation" />
        <PageSkeleton />
      </div>
    )
  }

  const modals = (
    <>
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
            <Input type="date" value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} />
          </FormField>
          <FormField label="Salary" required>
            <Input type="number" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="Salary" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Currency">
              <Select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} options={[{ value: 'NZD', label: 'NZD' }, { value: 'AUD', label: 'AUD' }, { value: 'USD', label: 'USD' }, { value: 'GBP', label: 'GBP' }, { value: 'EUR', label: 'EUR' }]} />
            </FormField>
            <FormField label="Frequency">
              <Select value={form.pay_frequency} onChange={e => setForm({ ...form, pay_frequency: e.target.value })} options={[{ value: 'annual', label: 'Annual' }, { value: 'monthly', label: 'Monthly' }, { value: 'hourly', label: 'Hourly' }]} />
            </FormField>
          </div>
          <FormField label="Reason">
            <Select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason (optional)" options={[{ value: 'hire', label: 'New Hire' }, { value: 'promotion', label: 'Promotion' }, { value: 'merit', label: 'Merit Increase' }, { value: 'adjustment', label: 'Adjustment' }, { value: 'market', label: 'Market Adjustment' }]} />
          </FormField>
          <FormField label="Notes">
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes (optional)" rows={2} />
          </FormField>
        </div>
      </Modal>

      {/* Edit compensation record modal */}
      <Modal
        open={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        title="Edit Compensation Record"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingRecord(null)} disabled={editSubmitting}>Cancel</Button>
            <Button onClick={handleEditRecord} loading={editSubmitting}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Effective Date" required>
            <Input type="date" value={editForm.effective_date} onChange={e => setEditForm({ ...editForm, effective_date: e.target.value })} />
          </FormField>
          <FormField label="Salary" required>
            <Input type="number" value={editForm.salary} onChange={e => setEditForm({ ...editForm, salary: e.target.value })} placeholder="Salary" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Currency">
              <Select value={editForm.currency} onChange={e => setEditForm({ ...editForm, currency: e.target.value })} options={[{ value: 'NZD', label: 'NZD' }, { value: 'AUD', label: 'AUD' }, { value: 'USD', label: 'USD' }, { value: 'GBP', label: 'GBP' }, { value: 'EUR', label: 'EUR' }]} />
            </FormField>
            <FormField label="Frequency">
              <Select value={editForm.pay_frequency} onChange={e => setEditForm({ ...editForm, pay_frequency: e.target.value })} options={[{ value: 'annual', label: 'Annual' }, { value: 'monthly', label: 'Monthly' }, { value: 'hourly', label: 'Hourly' }]} />
            </FormField>
          </div>
          <FormField label="Reason">
            <Select value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })} placeholder="Reason (optional)" options={[{ value: 'hire', label: 'New Hire' }, { value: 'promotion', label: 'Promotion' }, { value: 'merit', label: 'Merit Increase' }, { value: 'adjustment', label: 'Adjustment' }, { value: 'market', label: 'Market Adjustment' }]} />
          </FormField>
          <FormField label="Notes">
            <Textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Notes (optional)" rows={2} />
          </FormField>
        </div>
      </Modal>

      {/* Band form modal */}
      <Modal
        open={showBandForm}
        onClose={() => setShowBandForm(false)}
        title={editingBand ? 'Edit Salary Band' : 'Add Salary Band'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowBandForm(false)} disabled={bandSubmitting}>Cancel</Button>
            <Button onClick={handleSaveBand} loading={bandSubmitting}>{editingBand ? 'Save Changes' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Band Name" required>
              <Input value={bandForm.name} onChange={e => setBandForm({ ...bandForm, name: e.target.value })} placeholder="e.g. Senior Engineer" />
            </FormField>
            <FormField label="Grade" required>
              <Input value={bandForm.grade} onChange={e => setBandForm({ ...bandForm, grade: e.target.value })} placeholder="e.g. L5" />
            </FormField>
          </div>
          <FormField label="Position">
            <Select
              value={bandForm.position_id}
              onChange={e => setBandForm({ ...bandForm, position_id: e.target.value })}
              placeholder="Link to position (optional)"
              options={positions.map(p => ({ value: p.id, label: p.title }))}
            />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="Min Salary" required>
              <Input type="number" value={bandForm.min_salary} onChange={e => setBandForm({ ...bandForm, min_salary: e.target.value })} placeholder="Min" />
            </FormField>
            <FormField label="Mid Salary" required>
              <Input type="number" value={bandForm.mid_salary} onChange={e => setBandForm({ ...bandForm, mid_salary: e.target.value })} placeholder="Mid" />
            </FormField>
            <FormField label="Max Salary" required>
              <Input type="number" value={bandForm.max_salary} onChange={e => setBandForm({ ...bandForm, max_salary: e.target.value })} placeholder="Max" />
            </FormField>
          </div>
          <FormField label="Currency">
            <Select value={bandForm.currency} onChange={e => setBandForm({ ...bandForm, currency: e.target.value })} options={[{ value: 'NZD', label: 'NZD' }, { value: 'AUD', label: 'AUD' }, { value: 'USD', label: 'USD' }, { value: 'GBP', label: 'GBP' }, { value: 'EUR', label: 'EUR' }]} />
          </FormField>
        </div>
      </Modal>
    </>
  )

  // Detail view
  if (selectedEmployee) {
    const matchingBand = findBandForPosition(selectedEmployee.position_title)
    let bandStatus: 'below' | 'within' | 'above' | null = null
    if (matchingBand) {
      const annualSalary = selectedEmployee.pay_frequency === 'monthly'
        ? selectedEmployee.salary * 12
        : selectedEmployee.pay_frequency === 'hourly'
          ? selectedEmployee.salary * 2080
          : selectedEmployee.salary
      if (annualSalary < matchingBand.min_salary) bandStatus = 'below'
      else if (annualSalary > matchingBand.max_salary) bandStatus = 'above'
      else bandStatus = 'within'
    }

    return (
      <div>
        {modals}
        <Button variant="ghost" size="sm" onClick={() => setSelectedEmployee(null)} className="mb-4">
          &larr; Back to Compensation
        </Button>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">{selectedEmployee.employee_id ? <EmployeeLink employeeId={selectedEmployee.employee_id} name={selectedEmployee.employee_name || 'Employee'} className="text-xl font-semibold" /> : <span className="text-white">{selectedEmployee.employee_name || 'Employee'}</span>}</h2>
              <p className="text-sm text-gray-400">
                {selectedEmployee.position_title || 'No position'}
                {selectedEmployee.department_name ? ` \u00B7 ${selectedEmployee.department_name}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(selectedEmployee.salary, selectedEmployee.currency)}</p>
              <p className="text-xs text-gray-500">{frequencyLabel[selectedEmployee.pay_frequency] || selectedEmployee.pay_frequency} &middot; Effective {formatDate(selectedEmployee.effective_date)}</p>
              <Button size="sm" className="mt-2" onClick={openAddForEmployee}>Add Record</Button>
            </div>
          </div>

          {/* Salary band indicator */}
          {matchingBand && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">
                  Salary Band: {matchingBand.name} (Grade {matchingBand.grade})
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  bandStatus === 'below' ? 'bg-red-600/20 text-red-400' :
                  bandStatus === 'above' ? 'bg-amber-600/20 text-amber-400' :
                  'bg-emerald-600/20 text-emerald-400'
                }`}>
                  {bandStatus === 'below' ? 'Below Range' : bandStatus === 'above' ? 'Above Range' : 'Within Range'}
                </span>
              </div>
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute h-full bg-gray-600 rounded-full"
                  style={{
                    left: '0%',
                    width: '100%',
                  }}
                />
                <div
                  className="absolute h-full bg-blue-500/30 rounded-full"
                  style={{
                    left: `${Math.max(0, ((matchingBand.mid_salary - matchingBand.min_salary) / (matchingBand.max_salary - matchingBand.min_salary)) * 100 - 2)}%`,
                    width: '4%',
                  }}
                />
                {(() => {
                  const annualSalary = selectedEmployee.pay_frequency === 'monthly'
                    ? selectedEmployee.salary * 12
                    : selectedEmployee.pay_frequency === 'hourly'
                      ? selectedEmployee.salary * 2080
                      : selectedEmployee.salary
                  const pct = Math.min(100, Math.max(0, ((annualSalary - matchingBand.min_salary) / (matchingBand.max_salary - matchingBand.min_salary)) * 100))
                  return (
                    <div
                      className={`absolute top-0 w-2.5 h-full rounded-full ${
                        bandStatus === 'below' ? 'bg-red-400' :
                        bandStatus === 'above' ? 'bg-amber-400' :
                        'bg-emerald-400'
                      }`}
                      style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
                    />
                  )
                })()}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatCurrency(matchingBand.min_salary, matchingBand.currency)}</span>
                <span>{formatCurrency(matchingBand.mid_salary, matchingBand.currency)}</span>
                <span>{formatCurrency(matchingBand.max_salary, matchingBand.currency)}</span>
              </div>
            </div>
          )}
        </div>

        <h3 className="text-sm font-semibold text-white mb-3">Compensation History</h3>

        {history.length === 0 ? (
          <EmptyState message="No compensation history" icon="📊" />
        ) : (
          <div className="space-y-3">
            {history.map((record, idx) => {
              const prevRecord = history[idx + 1]
              const change = prevRecord ? ((record.salary - prevRecord.salary) / prevRecord.salary * 100) : null
              return (
                <div key={record.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">
                        {formatCurrency(record.salary, record.currency)}
                        <span className="text-gray-500 text-xs ml-1">/ {frequencyLabel[record.pay_frequency] || record.pay_frequency}</span>
                      </span>
                      {change !== null && (
                        <span className={`text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{formatDate(record.effective_date)}</span>
                      <Button variant="ghost" size="sm" onClick={() => openEditRecord(record)}>Edit</Button>
                    </div>
                  </div>
                  {record.reason && (
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-blue-600/20 text-blue-400 mr-2">
                      {reasonLabel[record.reason] || record.reason}
                    </span>
                  )}
                  {record.notes && <p className="text-xs text-gray-500 mt-1">{record.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Compensation"
        actions={
          tab === 'employees'
            ? <Button onClick={() => setShowAdd(true)}>Add Record</Button>
            : <Button onClick={openAddBand}>Add Band</Button>
        }
      />

      <div className="mb-4">
        <Tabs
          variant="pills"
          tabs={[
            { key: 'employees', label: 'Employees' },
            { key: 'bands', label: 'Salary Bands' },
          ]}
          active={tab}
          onChange={(k) => setTab(k as CompTab)}
        />
      </div>

      {modals}

      {tab === 'employees' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Employees" value={current.length} />
            <StatCard label="Total Annual Payroll" value={formatCurrency(totalPayroll, 'NZD')} color="green" />
            <StatCard label="Average Salary" value={formatCurrency(avgSalary, 'NZD')} color="blue" />
          </div>

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
            onRowClick={(comp) => setSelectedEmployee(comp)}
          />
        </>
      )}

      {tab === 'bands' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Salary Bands" value={bands.length} />
            <StatCard label="Grades" value={new Set(bands.map(b => b.grade)).size} color="blue" />
            <StatCard label="Linked Positions" value={bands.filter(b => b.position_id).length} color="green" />
          </div>

          {bands.length === 0 ? (
            <EmptyState message="No salary bands defined" icon="📊" action="Add Band" onAction={openAddBand} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bands.map(band => (
                <div key={band.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-white font-medium">{band.name}</h3>
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-600/20 text-purple-400">
                        Grade {band.grade}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditBand(band)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteBand(band)}>Delete</Button>
                    </div>
                  </div>
                  {band.position_title && (
                    <p className="text-xs text-gray-400 mb-2">Position: {band.position_title}</p>
                  )}
                  {/* Range bar */}
                  <div className="mt-3">
                    <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div className="absolute h-full bg-gradient-to-r from-blue-600/40 via-blue-500/60 to-blue-600/40 rounded-full w-full" />
                      <div
                        className="absolute h-full bg-blue-400 rounded-full w-1"
                        style={{
                          left: `${((band.mid_salary - band.min_salary) / (band.max_salary - band.min_salary)) * 100}%`,
                          transform: 'translateX(-50%)',
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{formatCurrency(band.min_salary, band.currency)}</span>
                      <span className="text-blue-400">{formatCurrency(band.mid_salary, band.currency)}</span>
                      <span>{formatCurrency(band.max_salary, band.currency)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
