import { useState, useEffect } from 'react'
import { fetchSuccessionPlans, createSuccessionPlan, fetchSuccessionCandidates, addSuccessionCandidate, removeSuccessionCandidate } from '../modules/succession/api'
import { fetchEmployees, fetchPositions } from '../api'
import type { SuccessionPlan, SuccessionCandidate } from '../modules/succession/types'
import type { Employee } from '../types'
import type { Position } from '../modules/positions/types'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'

const riskColors: Record<string, string> = {
  low: 'bg-emerald-600/20 text-emerald-400',
  medium: 'bg-amber-600/20 text-amber-400',
  high: 'bg-orange-600/20 text-orange-400',
  critical: 'bg-red-600/20 text-red-400',
}

const readinessLabel: Record<string, string> = {
  ready_now: 'Ready Now',
  ready_1_year: 'Ready in 1 Year',
  ready_2_years: 'Ready in 2 Years',
  not_ready: 'Not Ready',
}

const readinessColors: Record<string, string> = {
  ready_now: 'bg-emerald-600/20 text-emerald-400',
  ready_1_year: 'bg-blue-600/20 text-blue-400',
  ready_2_years: 'bg-amber-600/20 text-amber-400',
  not_ready: 'bg-gray-700 text-gray-300',
}

function RiskBadge({ level }: { level: string }) {
  const classes = riskColors[level] || 'bg-gray-700 text-gray-300'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {level}
    </span>
  )
}

function ReadinessBadge({ readiness }: { readiness: string }) {
  const classes = readinessColors[readiness] || 'bg-gray-700 text-gray-300'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {readinessLabel[readiness] || readiness.replace(/_/g, ' ')}
    </span>
  )
}

export default function Succession() {
  const [plans, setPlans] = useState<SuccessionPlan[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<SuccessionCandidate[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [form, setForm] = useState({ position_id: '', incumbent_id: '', risk_of_loss: 'low', impact_of_loss: 'low', notes: '' })
  const [candidateForm, setCandidateForm] = useState({ employee_id: '', readiness: 'not_ready', notes: '' })

  useEffect(() => {
    fetchSuccessionPlans().then(setPlans).catch(() => {})
    fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {})
    fetchPositions().then(setPositions).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedPlan) {
      fetchSuccessionCandidates(selectedPlan).then(setCandidates).catch(() => {})
    }
  }, [selectedPlan])

  const criticalCount = plans.filter(p => p.risk_of_loss === 'critical' || p.impact_of_loss === 'critical').length
  const highRiskCount = plans.filter(p => p.risk_of_loss === 'high' || p.risk_of_loss === 'critical').length
  const noCandidates = plans.filter(p => p.candidate_count === 0).length

  const handleAdd = async () => {
    if (!form.position_id) return
    await createSuccessionPlan(form)
    setShowAdd(false)
    setForm({ position_id: '', incumbent_id: '', risk_of_loss: 'low', impact_of_loss: 'low', notes: '' })
    fetchSuccessionPlans().then(setPlans).catch(() => {})
  }

  const handleAddCandidate = async () => {
    if (!candidateForm.employee_id || !selectedPlan) return
    await addSuccessionCandidate(selectedPlan, candidateForm)
    setCandidateForm({ employee_id: '', readiness: 'not_ready', notes: '' })
    setShowAddCandidate(false)
    fetchSuccessionCandidates(selectedPlan).then(setCandidates).catch(() => {})
    fetchSuccessionPlans().then(setPlans).catch(() => {})
  }

  const handleRemoveCandidate = async (candidateId: string) => {
    await removeSuccessionCandidate(candidateId)
    if (selectedPlan) {
      fetchSuccessionCandidates(selectedPlan).then(setCandidates).catch(() => {})
      fetchSuccessionPlans().then(setPlans).catch(() => {})
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Succession Planning</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          Add Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Plans" value={plans.length} />
        <StatCard label="Critical Positions" value={criticalCount} color="red" />
        <StatCard label="High Risk" value={highRiskCount} color="red" />
        <StatCard label="No Candidates" value={noCandidates} color="blue" />
      </div>

      {/* Add Plan modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-white mb-4">Add Succession Plan</h2>
            <div className="space-y-3">
              <select
                value={form.position_id}
                onChange={e => setForm({ ...form, position_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="">Select Position</option>
                {positions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.title}</option>
                ))}
              </select>
              <select
                value={form.incumbent_id}
                onChange={e => setForm({ ...form, incumbent_id: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              >
                <option value="">Current Incumbent (optional)</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Risk of Loss</label>
                  <select
                    value={form.risk_of_loss}
                    onChange={e => setForm({ ...form, risk_of_loss: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Impact of Loss</label>
                  <select
                    value={form.impact_of_loss}
                    onChange={e => setForm({ ...form, impact_of_loss: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
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

      {/* Candidates panel */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Succession Candidates</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddCandidate(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  + Add
                </button>
                <button onClick={() => setSelectedPlan(null)} className="text-gray-400 hover:text-white text-sm">Close</button>
              </div>
            </div>

            {/* Add candidate form */}
            {showAddCandidate && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4">
                <div className="space-y-2">
                  <select
                    value={candidateForm.employee_id}
                    onChange={e => setCandidateForm({ ...candidateForm, employee_id: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
                    ))}
                  </select>
                  <select
                    value={candidateForm.readiness}
                    onChange={e => setCandidateForm({ ...candidateForm, readiness: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="ready_now">Ready Now</option>
                    <option value="ready_1_year">Ready in 1 Year</option>
                    <option value="ready_2_years">Ready in 2 Years</option>
                    <option value="not_ready">Not Ready</option>
                  </select>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddCandidate(false)} className="text-xs text-gray-400 hover:text-white">Cancel</button>
                    <button onClick={handleAddCandidate} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Add</button>
                  </div>
                </div>
              </div>
            )}

            {candidates.length === 0 ? (
              <EmptyState message="No candidates identified yet" />
            ) : (
              <div className="space-y-2">
                {candidates.map(candidate => (
                  <div key={candidate.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium">{candidate.employee_name}</p>
                      {candidate.current_position && (
                        <p className="text-xs text-gray-500">{candidate.current_position}</p>
                      )}
                      <div className="mt-1">
                        <ReadinessBadge readiness={candidate.readiness} />
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCandidate(candidate.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans grid */}
      {plans.length === 0 ? (
        <EmptyState message="No succession plans yet" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-gray-600 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-white font-medium">{plan.position_title || 'Unknown Position'}</h3>
                  {plan.department_name && (
                    <p className="text-xs text-gray-500">{plan.department_name}</p>
                  )}
                </div>
              </div>

              {plan.incumbent_name && (
                <p className="text-sm text-gray-400 mb-2">Incumbent: {plan.incumbent_name}</p>
              )}

              <div className="flex gap-2 mb-2">
                <div>
                  <span className="text-xs text-gray-500 mr-1">Risk:</span>
                  <RiskBadge level={plan.risk_of_loss} />
                </div>
                <div>
                  <span className="text-xs text-gray-500 mr-1">Impact:</span>
                  <RiskBadge level={plan.impact_of_loss} />
                </div>
              </div>

              <p className="text-xs text-gray-500">
                {plan.candidate_count} candidate{plan.candidate_count !== 1 ? 's' : ''} identified
              </p>

              {plan.notes && <p className="text-xs text-gray-500 mt-1 truncate">{plan.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
