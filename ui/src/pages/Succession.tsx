import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSuccessionPlans, createSuccessionPlan, updateSuccessionPlan, fetchSuccessionCandidates, addSuccessionCandidate, updateSuccessionCandidate, removeSuccessionCandidate } from '../modules/succession/api'
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
import EmployeeLink from '../components/EmployeeLink'

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
  const [selectedPlan, setSelectedPlan] = useState<SuccessionPlan | null>(null)
  const [candidates, setCandidates] = useState<SuccessionCandidate[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [form, setForm] = useState({ position_id: '', incumbent_id: '', risk_of_loss: 'low', impact_of_loss: 'low', notes: '' })
  const [candidateForm, setCandidateForm] = useState({ employee_id: '', readiness: 'not_ready', notes: '' })
  const toast = useToast()
  const navigate = useNavigate()

  // Edit plan state
  const [showEditPlan, setShowEditPlan] = useState(false)
  const [editPlanForm, setEditPlanForm] = useState({ risk_of_loss: 'low', impact_of_loss: 'low', notes: '', incumbent_id: '' })
  const [editPlanSubmitting, setEditPlanSubmitting] = useState(false)

  // Edit candidate state
  const [editingCandidate, setEditingCandidate] = useState<SuccessionCandidate | null>(null)
  const [editCandidateForm, setEditCandidateForm] = useState({ readiness: 'not_ready', notes: '' })
  const [editCandidateSubmitting, setEditCandidateSubmitting] = useState(false)

  // Promote candidate state
  const [promotingCandidate, setPromotingCandidate] = useState<SuccessionCandidate | null>(null)
  const [promoting, setPromoting] = useState(false)

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
      fetchSuccessionCandidates(selectedPlan.id)
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
      await addSuccessionCandidate(selectedPlan.id, candidateForm)
      setCandidateForm({ employee_id: '', readiness: 'not_ready', notes: '' })
      setShowAddCandidate(false)
      toast.success('Candidate added')
      fetchSuccessionCandidates(selectedPlan.id).then(setCandidates).catch(() => {})
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
        fetchSuccessionCandidates(selectedPlan.id).then(setCandidates).catch(() => {})
        fetchSuccessionPlans().then(setPlans).catch(() => {})
      }
    } catch {
      toast.error('Failed to remove candidate')
    } finally {
      setRemovingId(null)
      setConfirmRemove(null)
    }
  }

  const openEditPlan = () => {
    if (!selectedPlan) return
    setEditPlanForm({
      risk_of_loss: selectedPlan.risk_of_loss,
      impact_of_loss: selectedPlan.impact_of_loss,
      notes: selectedPlan.notes || '',
      incumbent_id: selectedPlan.incumbent_id || '',
    })
    setShowEditPlan(true)
  }

  const handleEditPlan = async () => {
    if (!selectedPlan) return
    setEditPlanSubmitting(true)
    try {
      await updateSuccessionPlan(selectedPlan.id, {
        risk_of_loss: editPlanForm.risk_of_loss,
        impact_of_loss: editPlanForm.impact_of_loss,
        notes: editPlanForm.notes || null,
        incumbent_id: editPlanForm.incumbent_id || null,
      })
      toast.success('Succession plan updated')
      setShowEditPlan(false)
      const refreshed = await fetchSuccessionPlans()
      setPlans(refreshed)
      const updated = refreshed.find(p => p.id === selectedPlan.id)
      if (updated) setSelectedPlan(updated)
    } catch {
      toast.error('Failed to update succession plan')
    } finally {
      setEditPlanSubmitting(false)
    }
  }

  const openEditCandidate = (candidate: SuccessionCandidate) => {
    setEditingCandidate(candidate)
    setEditCandidateForm({
      readiness: candidate.readiness,
      notes: candidate.notes || '',
    })
  }

  const handleEditCandidate = async () => {
    if (!editingCandidate) return
    setEditCandidateSubmitting(true)
    try {
      await updateSuccessionCandidate(editingCandidate.id, editCandidateForm)
      toast.success('Candidate updated')
      setEditingCandidate(null)
      if (selectedPlan) {
        fetchSuccessionCandidates(selectedPlan.id).then(setCandidates).catch(() => {})
      }
    } catch {
      toast.error('Failed to update candidate')
    } finally {
      setEditCandidateSubmitting(false)
    }
  }

  const handlePromoteCandidate = async () => {
    if (!promotingCandidate || !selectedPlan) return
    setPromoting(true)
    try {
      await updateSuccessionPlan(selectedPlan.id, { incumbent_id: promotingCandidate.employee_id })
      toast.success(`${promotingCandidate.employee_name} promoted to incumbent`)
      setPromotingCandidate(null)
      const refreshed = await fetchSuccessionPlans()
      setPlans(refreshed)
      const updated = refreshed.find(p => p.id === selectedPlan.id)
      if (updated) setSelectedPlan(updated)
    } catch {
      toast.error('Failed to promote candidate')
    } finally {
      setPromoting(false)
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

  // Detail view for selected plan
  if (selectedPlan) {
    return (
      <div>
        <Button variant="ghost" size="sm" onClick={() => { setSelectedPlan(null); setCandidates([]) }} className="mb-4">
          &larr; Back to Plans
        </Button>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white">
                <button
                  className="hover:text-blue-400 transition-colors text-left"
                  onClick={() => navigate('/positions')}
                  title="View position details"
                >
                  {selectedPlan.position_title || 'Unknown Position'}
                </button>
              </h2>
              {selectedPlan.department_name && (
                <p className="text-sm text-gray-400">{selectedPlan.department_name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={openEditPlan}>Edit Plan</Button>
              <Button size="sm" onClick={() => setShowAddCandidate(true)}>Add Candidate</Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Incumbent</p>
              <p className="text-sm">{selectedPlan.incumbent_id ? <EmployeeLink employeeId={selectedPlan.incumbent_id} name={selectedPlan.incumbent_name || 'Unknown'} /> : <span className="text-white">{'\u2014'}</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Risk of Loss</p>
              <RiskBadge level={selectedPlan.risk_of_loss} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Impact of Loss</p>
              <RiskBadge level={selectedPlan.impact_of_loss} />
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Candidates</p>
              <p className="text-sm text-white">{selectedPlan.candidate_count}</p>
            </div>
          </div>

          {selectedPlan.notes && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-300">{selectedPlan.notes}</p>
            </div>
          )}
        </div>

        {/* Add candidate form modal */}
        <Modal
          open={showAddCandidate}
          onClose={() => setShowAddCandidate(false)}
          title="Add Candidate"
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowAddCandidate(false)} disabled={submittingCandidate}>Cancel</Button>
              <Button onClick={handleAddCandidate} loading={submittingCandidate}>Add</Button>
            </>
          }
        >
          <div className="space-y-3">
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
            <FormField label="Notes">
              <Textarea
                value={candidateForm.notes}
                onChange={e => setCandidateForm({ ...candidateForm, notes: e.target.value })}
                placeholder="Notes (optional)"
                rows={2}
              />
            </FormField>
          </div>
        </Modal>

        {/* Candidates list */}
        <h3 className="text-sm font-semibold text-white mb-3">Succession Candidates</h3>

        {candidates.length === 0 ? (
          <EmptyState message="No candidates identified yet" icon="👤" action="Add Candidate" onAction={() => setShowAddCandidate(true)} />
        ) : (
          <div className="space-y-2">
            {candidates.map(candidate => (
              <div key={candidate.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{candidate.employee_id ? <EmployeeLink employeeId={candidate.employee_id} name={candidate.employee_name || 'Unknown'} className="font-medium" /> : <span className="text-white">{candidate.employee_name}</span>}</p>
                  {candidate.current_position && (
                    <p className="text-xs text-gray-500">{candidate.current_position}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <ReadinessBadge readiness={candidate.readiness} />
                    {candidate.notes && <span className="text-xs text-gray-500">{candidate.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {candidate.readiness === 'ready_now' && selectedPlan.incumbent_id !== candidate.employee_id && (
                    <Button
                      size="sm"
                      onClick={() => setPromotingCandidate(candidate)}
                    >
                      Promote
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditCandidate(candidate)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmRemove(candidate.id)}
                    loading={removingId === candidate.id}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

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

        {/* Edit plan modal */}
        <Modal
          open={showEditPlan}
          onClose={() => setShowEditPlan(false)}
          title="Edit Succession Plan"
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowEditPlan(false)} disabled={editPlanSubmitting}>Cancel</Button>
              <Button onClick={handleEditPlan} loading={editPlanSubmitting}>Save Changes</Button>
            </>
          }
        >
          <div className="space-y-3">
            <FormField label="Current Incumbent">
              <Select
                value={editPlanForm.incumbent_id}
                onChange={e => setEditPlanForm({ ...editPlanForm, incumbent_id: e.target.value })}
                placeholder="Select incumbent (optional)"
                options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Risk of Loss">
                <Select
                  value={editPlanForm.risk_of_loss}
                  onChange={e => setEditPlanForm({ ...editPlanForm, risk_of_loss: e.target.value })}
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
                  value={editPlanForm.impact_of_loss}
                  onChange={e => setEditPlanForm({ ...editPlanForm, impact_of_loss: e.target.value })}
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
                value={editPlanForm.notes}
                onChange={e => setEditPlanForm({ ...editPlanForm, notes: e.target.value })}
                placeholder="Notes (optional)"
                rows={2}
              />
            </FormField>
          </div>
        </Modal>

        {/* Edit candidate modal */}
        <Modal
          open={!!editingCandidate}
          onClose={() => setEditingCandidate(null)}
          title={`Edit Candidate \u2014 ${editingCandidate?.employee_name || ''}`}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingCandidate(null)} disabled={editCandidateSubmitting}>Cancel</Button>
              <Button onClick={handleEditCandidate} loading={editCandidateSubmitting}>Save Changes</Button>
            </>
          }
        >
          <div className="space-y-3">
            <FormField label="Readiness">
              <Select
                value={editCandidateForm.readiness}
                onChange={e => setEditCandidateForm({ ...editCandidateForm, readiness: e.target.value })}
                options={[
                  { value: 'ready_now', label: 'Ready Now' },
                  { value: 'ready_1_year', label: 'Ready in 1 Year' },
                  { value: 'ready_2_years', label: 'Ready in 2 Years' },
                  { value: 'not_ready', label: 'Not Ready' },
                ]}
              />
            </FormField>
            <FormField label="Notes">
              <Textarea
                value={editCandidateForm.notes}
                onChange={e => setEditCandidateForm({ ...editCandidateForm, notes: e.target.value })}
                placeholder="Notes (optional)"
                rows={2}
              />
            </FormField>
          </div>
        </Modal>

        {/* Promote candidate confirmation */}
        <ConfirmDialog
          open={!!promotingCandidate}
          onClose={() => setPromotingCandidate(null)}
          onConfirm={handlePromoteCandidate}
          title="Promote Candidate"
          message={`Are you sure you want to promote ${promotingCandidate?.employee_name || 'this candidate'} to incumbent for this position?`}
          confirmLabel="Promote"
          loading={promoting}
        />
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

      {/* Plans grid */}
      {plans.length === 0 ? (
        <EmptyState message="No succession plans yet" icon="📊" action="Add Plan" onAction={() => setShowAdd(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan)}
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
                <p className="text-sm text-gray-400 mb-2">Incumbent: {plan.incumbent_id ? <EmployeeLink employeeId={plan.incumbent_id} name={plan.incumbent_name || 'Unknown'} /> : plan.incumbent_name}</p>
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
