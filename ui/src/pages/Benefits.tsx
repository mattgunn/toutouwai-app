import { useState, useEffect } from 'react'
import { fetchBenefitPlans, createBenefitPlan, fetchBenefitEnrollments, createBenefitEnrollment } from '../modules/benefits/api'
import { fetchEmployees } from '../api'
import type { BenefitPlan, BenefitEnrollment } from '../modules/benefits/types'
import type { Employee } from '../types'
import StatusBadge from '../components/StatusBadge'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'

const planTypeLabel: Record<string, string> = {
  health: 'Health',
  dental: 'Dental',
  vision: 'Vision',
  life: 'Life',
  retirement: 'Retirement',
  other: 'Other',
}

const coverageLabel: Record<string, string> = {
  employee: 'Employee Only',
  employee_spouse: 'Employee + Spouse',
  family: 'Family',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' }).format(amount)
}

export default function Benefits() {
  const [tab, setTab] = useState<'plans' | 'enrollments'>('plans')
  const [plans, setPlans] = useState<BenefitPlan[]>([])
  const [enrollments, setEnrollments] = useState<BenefitEnrollment[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [showAddEnrollment, setShowAddEnrollment] = useState(false)
  const [planForm, setPlanForm] = useState({ name: '', type: 'health', provider: '', description: '' })
  const [enrollForm, setEnrollForm] = useState({ employee_id: '', plan_id: '', start_date: '', coverage_level: 'employee', employee_contribution: '', employer_contribution: '' })

  useEffect(() => {
    fetchBenefitPlans().then(setPlans).catch(() => {})
    fetchBenefitEnrollments().then(setEnrollments).catch(() => {})
    fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {})
  }, [])

  const activePlans = plans.filter(p => p.is_active)
  const activeEnrollments = enrollments.filter(e => e.status === 'active')
  const totalEmployerCost = activeEnrollments.reduce((sum, e) => sum + e.employer_contribution, 0)

  const handleAddPlan = async () => {
    if (!planForm.name || !planForm.type) return
    await createBenefitPlan(planForm)
    setShowAddPlan(false)
    setPlanForm({ name: '', type: 'health', provider: '', description: '' })
    fetchBenefitPlans().then(setPlans).catch(() => {})
  }

  const handleAddEnrollment = async () => {
    if (!enrollForm.employee_id || !enrollForm.plan_id || !enrollForm.start_date) return
    await createBenefitEnrollment({
      ...enrollForm,
      employee_contribution: parseFloat(enrollForm.employee_contribution) || 0,
      employer_contribution: parseFloat(enrollForm.employer_contribution) || 0,
    })
    setShowAddEnrollment(false)
    setEnrollForm({ employee_id: '', plan_id: '', start_date: '', coverage_level: 'employee', employee_contribution: '', employer_contribution: '' })
    fetchBenefitEnrollments().then(setEnrollments).catch(() => {})
    fetchBenefitPlans().then(setPlans).catch(() => {})
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Benefits</h1>
        <button
          onClick={() => tab === 'plans' ? setShowAddPlan(true) : setShowAddEnrollment(true)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          {tab === 'plans' ? 'Add Plan' : 'Enroll Employee'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Plans" value={activePlans.length} />
        <StatCard label="Active Enrollments" value={activeEnrollments.length} color="blue" />
        <StatCard label="Monthly Employer Cost" value={formatCurrency(totalEmployerCost)} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab('plans')}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            tab === 'plans' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          Plans
        </button>
        <button
          onClick={() => setTab('enrollments')}
          className={`px-3 py-1.5 text-sm rounded transition-colors ${
            tab === 'enrollments' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          Enrollments
        </button>
      </div>

      {/* Add Plan modal */}
      {showAddPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Add Benefit Plan</h2>
            <div className="space-y-3">
              <input
                type="text"
                value={planForm.name}
                onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Plan Name"
              />
              <select
                value={planForm.type}
                onChange={e => setPlanForm({ ...planForm, type: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="health">Health</option>
                <option value="dental">Dental</option>
                <option value="vision">Vision</option>
                <option value="life">Life</option>
                <option value="retirement">Retirement</option>
                <option value="other">Other</option>
              </select>
              <input
                type="text"
                value={planForm.provider}
                onChange={e => setPlanForm({ ...planForm, provider: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Provider (optional)"
              />
              <textarea
                value={planForm.description}
                onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                placeholder="Description (optional)"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddPlan(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleAddPlan} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Enrollment modal */}
      {showAddEnrollment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Enroll Employee</h2>
            <div className="space-y-3">
              <select
                value={enrollForm.employee_id}
                onChange={e => setEnrollForm({ ...enrollForm, employee_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
              <select
                value={enrollForm.plan_id}
                onChange={e => setEnrollForm({ ...enrollForm, plan_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="">Select Plan</option>
                {activePlans.map(plan => (
                  <option key={plan.id} value={plan.id}>{plan.name} ({planTypeLabel[plan.type] || plan.type})</option>
                ))}
              </select>
              <input
                type="date"
                value={enrollForm.start_date}
                onChange={e => setEnrollForm({ ...enrollForm, start_date: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              />
              <select
                value={enrollForm.coverage_level}
                onChange={e => setEnrollForm({ ...enrollForm, coverage_level: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="employee">Employee Only</option>
                <option value="employee_spouse">Employee + Spouse</option>
                <option value="family">Family</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={enrollForm.employee_contribution}
                  onChange={e => setEnrollForm({ ...enrollForm, employee_contribution: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  placeholder="Employee $/mo"
                />
                <input
                  type="number"
                  value={enrollForm.employer_contribution}
                  onChange={e => setEnrollForm({ ...enrollForm, employer_contribution: e.target.value })}
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  placeholder="Employer $/mo"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddEnrollment(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleAddEnrollment} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">Enroll</button>
            </div>
          </div>
        </div>
      )}

      {/* Plans tab */}
      {tab === 'plans' && (
        plans.length === 0 ? (
          <EmptyState message="No benefit plans yet" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-medium">{plan.name}</h3>
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-600/20 text-purple-400 mt-1">
                      {planTypeLabel[plan.type] || plan.type}
                    </span>
                  </div>
                  <StatusBadge status={plan.is_active ? 'active' : 'inactive'} />
                </div>
                {plan.provider && <p className="text-sm text-gray-400 mt-1">Provider: {plan.provider}</p>}
                {plan.description && <p className="text-xs text-gray-500 mt-1">{plan.description}</p>}
                <p className="text-xs text-gray-500 mt-2">{plan.active_enrollments} active enrollment{plan.active_enrollments !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        )
      )}

      {/* Enrollments tab */}
      {tab === 'enrollments' && (
        enrollments.length === 0 ? (
          <EmptyState message="No enrollments yet" />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 hidden md:table-cell">Coverage</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Employee $</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Employer $</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map(enrollment => (
                  <tr key={enrollment.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-white">{enrollment.employee_name || '\u2014'}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {enrollment.plan_name || '\u2014'}
                      {enrollment.plan_type && (
                        <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-xs bg-purple-600/20 text-purple-400">
                          {planTypeLabel[enrollment.plan_type] || enrollment.plan_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{coverageLabel[enrollment.coverage_level] || enrollment.coverage_level}</td>
                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{formatCurrency(enrollment.employee_contribution)}</td>
                    <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{formatCurrency(enrollment.employer_contribution)}</td>
                    <td className="px-4 py-3"><StatusBadge status={enrollment.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
