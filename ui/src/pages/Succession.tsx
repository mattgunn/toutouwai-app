import { useState, useEffect } from 'react'
import { fetchSuccessionPlans, createSuccessionPlan, fetchSuccessionCandidates, addSuccessionCandidate, removeSuccessionCandidate } from '../modules/succession/api'
import { fetchEmployees, fetchPositions } from '../api'
import type { SuccessionPlan, SuccessionCandidate } from '../modules/succession/types'
import type { Employee } from '../types'
import type { Position } from '../modules/positions/types'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/ConfirmDialog'
import { FormField, Select, Textarea } from '../components/FormField'
import { PageSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'

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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submittingCandidate, setSubmittingCandidate] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<SuccessionCandidate[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [form, setForm] = useState({ position_id: '', incumbent_id: '', risk_of_loss: 'low', impact_of_loss: 'low', notes: '' })
  const [candidateForm, setCandidateForm] = useState({ employee_id: '', readiness: 'not_ready', notes: '' })
  const toast = useToast()

  useEffect(() => {
    Promise.all([
      fetchSuccessionPlans().then(setPlans).catch(() => {}),
      fetchEmployees().then(r => setEmployees(r.employees)).catch(() => {}),
      fetchPositions().then(setPositions).catch(() => {}),
    ])
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedPlan) {
      fetchSuccessionCandidates(selectedPlan)
        .then(setCandidates)
        .catch(() => {})
    }
  }, [selectedPlan])

  const criticalCount = plans.filter(p => p.risk_of_loss === 'critical' || p.impact_of_loss === 'critical').length
  const highRiskCount = plans.filter(p => p.risk_of_loss === 'high' || p.risk_of_loss === 'critical').length
  const noCandidates = plans.filter(p => p.candidate_count === 0).length

  const handleAdd = async () => {
    if (!form.position_id) return
    setSubmitting(true)
    try {
      await createSuccessionPlan(form)
      setShowAdd(false)
      setForm({ position_id: '', incumbent_id: '', risk_of_loss: 'low', impact_of_loss: 'low', notes: '' })
      toast.success('Succession plan created')
      fetchSuccessionPlans().then(setPlans).catch(() => toast.error('Failed to refresh plans'))
    } catch {
      toast.error('Failed to create succession plan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddCandidate = async () => {
    if (!candidateForm.employee_id || !selectedPlan) return
    setSubmittingCandidate(true)
    try {
      await addSuccessionCandidate(selectedPlan, candidateForm)
      setCandidateForm({ employee_id: '', readiness: 'not_ready', notes: '' })
      setShowAddCandidate(false)
      toast.success('Candidate added')
      fetchSuccessionCandidates(selectedPlan).then(setCandidates).catch(() => {})
      fetchSuccessionPlans().then(setPlans).catch(() => {})
    } catch {
      toast.error('Failed to add candidate')
    } finally {
      setSubmittingCandidate(false)
    }
  }

  const handleRemoveCandidate = async (candidateId: string) => {
    setRemovingId(candidateId)
    try {
      await removeSuccessionCandidate(candidateId)
      toast.success('Candidate removed')
      if (selectedPlan) {
        fetchSuccessionCandidates(selectedPlan).then(setCandidates).catch(() => {})
        fetchSuccessionPlans().then(setPlans).catch(() => {})
      }
    } catch {
      toast.error('Failed to remove candidate')
    } finally {
      setRemovingId(null)
      setConfirmRemove(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Succession Planning" />
        <PageSkeleton />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Succession Planning" actions={<Button onClick={() => setShowAdd(true)}>Add Plan</Button>} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Plans" value={plans.length} />
        <StatCard label="Critical Positions" value={criticalCount} color="red" />
        <StatCard label="High Risk" value={highRiskCount} color="red" />
        <StatCard label="No Candidates" value={noCandidates} color="blue" />
      </div>

      {/* Add Plan modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Succession Plan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAdd(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleAdd} loading={submitting}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Position" required>
            <Select
              value={form.position_id}
              onChange={e => setForm({ ...form, position_id: e.target.value })}
              placeholder="Select Position"
              options={positions.map(pos => ({ value: pos.id, label: pos.title }))}
            />
          </FormField>
          <FormField label="Current Incumbent">
            <Select
              value={form.incumbent_id}
              onChange={e => setForm({ ...form, incumbent_id: e.target.value })}
              placeholder="Current Incumbent (optional)"
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Risk of Loss">
              <Select
                value={form.risk_of_loss}
                onChange={e => setForm({ ...form, risk_of_loss: e.target.value })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
            </FormField>
            <FormField label="Impact of Loss">
              <Select
                value={form.impact_of_loss}
                onChange={e => setForm({ ...form, impact_of_loss: e.target.value })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Critical' },
                ]}
              />
            </FormField>
          </div>
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

      {/* Candidates panel */}
      <Modal
        open={!!selectedPlan}
        onClose={() => setSelectedPlan(null)}
        title="Succession Candidates"
        size="lg"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowAddCandidate(true)}>
            + Add Candidate
          </Button>
        }
      >
        {/* Add candidate form */}
        {showAddCandidate && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4">
            <div className="space-y-2">
              <FormField label="Employee" required>
                <Select
                  value={candidateForm.employee_id}
                  onChange={e => setCandidateForm({ ...candidateForm, employee_id: e.target.value })}
                  placeholder="Select Employee"
                  options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
                />
              </FormField>
              <FormField label="Readiness">
                <Select
                  value={candidateForm.readiness}
                  onChange={e => setCandidateForm({ ...candidateForm, readiness: e.target.value })}
                  options={[
                    { value: 'ready_now', label: 'Ready Now' },
                    { value: 'ready_1_year', label: 'Ready in 1 Year' },
                    { value: 'ready_2_years', label: 'Ready in 2 Years' },
                    { value: 'not_ready', label: 'Not Ready' },
                  ]}
                />
              </FormField>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddCandidate(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddCandidate} loading={submittingCandidate}>Add</Button>
              </div>
            </div>
          </div>
        )}

        {candidates.length === 0 ? (
          <EmptyState message="No candidates identified yet" icon="👤" action="Add Candidate" onAction={() => setShowAddCandidate(true)} />
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
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmRemove(candidate.id)}
                  loading={removingId === candidate.id}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Confirm remove candidate */}
      <ConfirmDialog
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={() => confirmRemove && handleRemoveCandidate(confirmRemove)}
        title="Remove Candidate"
        message="Are you sure you want to remove this candidate from the succession plan?"
        confirmLabel="Remove"
        variant="danger"
        loading={!!removingId}
      />

      {/* Plans grid */}
      {plans.length === 0 ? (
        <EmptyState message="No succession plans yet" icon="📊" action="Add Plan" onAction={() => setShowAdd(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className="bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-gray-600 hover:bg-gray-800/50 hover:shadow-md transition-all duration-200"
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
