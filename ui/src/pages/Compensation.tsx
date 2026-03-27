import { useState, useEffect } from 'react'
import { fetchCurrentCompensation, fetchCompensation, createCompensation } from '../modules/compensation/api'
import { fetchEmployees } from '../api'
import type { CurrentCompensation, CompensationRecord } from '../modules/compensation/types'
import type { Employee } from '../types'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'

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
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)
  const [history, setHistory] = useState<CompensationRecord[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ employee_id: '', effective_date: '', salary: '', currency: 'NZD', pay_frequency: 'annual', reason: '', notes: '' })

  useEffect(() => {
    fetchCurrentCompensation().then(setCurrent).catch(() => {})
    fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedEmployee) {
      fetchCompensation({ employee_id: selectedEmployee }).then(setHistory).catch(() => {})
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
    await createCompensation({ ...form, salary: parseFloat(form.salary) })
    setShowAdd(false)
    setForm({ employee_id: '', effective_date: '', salary: '', currency: 'NZD', pay_frequency: 'annual', reason: '', notes: '' })
    fetchCurrentCompensation().then(setCurrent).catch(() => {})
    if (selectedEmployee) {
      fetchCompensation({ employee_id: selectedEmployee }).then(setHistory).catch(() => {})
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Compensation</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Add Record
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Employees" value={current.length} />
        <StatCard label="Total Annual Payroll" value={formatCurrency(totalPayroll, 'NZD')} color="green" />
        <StatCard label="Average Salary" value={formatCurrency(avgSalary, 'NZD')} color="blue" />
      </div>

      {/* Add compensation modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Add Compensation Record</h2>
            <div className="space-y-3">
              <select
                value={form.employee_id}
                onChange={e => setForm({ ...form, employee_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
              <input
                type="date"
                value={form.effective_date}
                onChange={e => setForm({ ...form, effective_date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Effective Date"
              />
              <input
                type="number"
                value={form.salary}
                onChange={e => setForm({ ...form, salary: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Salary"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                >
                  <option value="NZD">NZD</option>
                  <option value="AUD">AUD</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                  <option value="EUR">EUR</option>
                </select>
                <select
                  value={form.pay_frequency}
                  onChange={e => setForm({ ...form, pay_frequency: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                >
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <select
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="">Reason (optional)</option>
                <option value="hire">New Hire</option>
                <option value="promotion">Promotion</option>
                <option value="merit">Merit Increase</option>
                <option value="adjustment">Adjustment</option>
                <option value="market">Market Adjustment</option>
              </select>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Notes (optional)"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleAdd} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* History panel */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Compensation History &mdash; {history[0]?.employee_name || 'Employee'}
              </h2>
              <button onClick={() => setSelectedEmployee(null)} className="text-gray-400 hover:text-white text-sm">Close</button>
            </div>
            {history.length === 0 ? (
              <EmptyState message="No compensation history" />
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
          </div>
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, department, or position..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message="No compensation records yet" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3 hidden md:table-cell">Department</th>
                <th className="px-4 py-3 hidden lg:table-cell">Position</th>
                <th className="px-4 py-3">Salary</th>
                <th className="px-4 py-3 hidden md:table-cell">Frequency</th>
                <th className="px-4 py-3 hidden lg:table-cell">Effective</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(comp => (
                <tr key={comp.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white">{comp.employee_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{comp.department_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{comp.position_title || '\u2014'}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">{formatCurrency(comp.salary, comp.currency)}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{frequencyLabel[comp.pay_frequency] || comp.pay_frequency}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{comp.effective_date}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedEmployee(comp.employee_id)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
