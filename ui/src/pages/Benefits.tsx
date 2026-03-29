import { useState, useEffect } from 'react'
import { fetchBenefitPlans, createBenefitPlan, updateBenefitPlan, fetchBenefitEnrollments, createBenefitEnrollment, updateBenefitEnrollment } from '../modules/benefits/api'
import { fetchEmployees } from '../api'
import type { BenefitPlan, BenefitEnrollment } from '../modules/benefits/types'
import type { Employee } from '../types'
import StatusBadge from '../components/StatusBadge'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Tabs from '../components/Tabs'
import ConfirmDialog from '../components/ConfirmDialog'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { PageSkeleton, SkeletonTable } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import EmployeeLink from '../components/EmployeeLink'

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
  const [tab, setTab] = useState('plans')
  const [plans, setPlans] = useState<BenefitPlan[]>([])
  const [enrollments, setEnrollments] = useState<BenefitEnrollment[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingPlan, setSubmittingPlan] = useState(false)
  const [submittingEnrollment, setSubmittingEnrollment] = useState(false)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [showAddEnrollment, setShowAddEnrollment] = useState(false)
  const [planForm, setPlanForm] = useState({ name: '', type: 'health', provider: '', description: '' })
  const [enrollForm, setEnrollForm] = useState({ employee_id: '', plan_id: '', start_date: '', coverage_level: 'employee', employee_contribution: '', employer_contribution: '' })
  const toast = useToast()

  // Plan detail view state
  const [selectedPlan, setSelectedPlan] = useState<BenefitPlan | null>(null)
  const [planEnrollments, setPlanEnrollments] = useState<BenefitEnrollment[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  // Edit enrollment state
  const [editingEnrollment, setEditingEnrollment] = useState<BenefitEnrollment | null>(null)
  const [editEnrollForm, setEditEnrollForm] = useState({ coverage_level: 'employee', employee_contribution: '', employer_contribution: '' })
  const [editingEnrollmentSubmitting, setEditingEnrollmentSubmitting] = useState(false)

  // Unenroll (cancel enrollment) state
  const [unenrollId, setUnenrollId] = useState<string | null>(null)
  const [unenrolling, setUnenrolling] = useState(false)

  // Deactivate plan state
  const [deactivatePlanId, setDeactivatePlanId] = useState<string | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  // Enroll from plan detail
  const [showPlanEnroll, setShowPlanEnroll] = useState(false)
  const [planEnrollForm, setPlanEnrollForm] = useState({ employee_id: '', start_date: '', coverage_level: 'employee', employee_contribution: '', employer_contribution: '' })
  const [planEnrolling, setPlanEnrolling] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchBenefitPlans().then(setPlans).catch(() => toast.error('Failed to load benefit plans')),
      fetchBenefitEnrollments().then(setEnrollments).catch(() => toast.error('Failed to load enrollments')),
      fetchEmployees().then(r => setEmployees(r.employees)).catch(() => toast.error('Failed to load employees')),
    ])
      .finally(() => setLoading(false))
  }, [])

  // Fetch enrollments for the selected plan
  useEffect(() => {
    if (!selectedPlan) return
    setDetailLoading(true)
    fetchBenefitEnrollments({ plan_id: selectedPlan.id })
      .then(setPlanEnrollments)
      .catch(() => setPlanEnrollments([]))
      .finally(() => setDetailLoading(false))
  }, [selectedPlan])

  const activePlans = plans.filter(p => p.is_active)
  const activeEnrollments = enrollments.filter(e => e.status === 'active')
  const totalEmployerCost = activeEnrollments.reduce((sum, e) => sum + e.employer_contribution, 0)

  const handleAddPlan = async () => {
    if (!planForm.name || !planForm.type) return
    setSubmittingPlan(true)
    try {
      await createBenefitPlan(planForm)
      setShowAddPlan(false)
      setPlanForm({ name: '', type: 'health', provider: '', description: '' })
      toast.success('Benefit plan created')
      fetchBenefitPlans().then(setPlans).catch(() => toast.error('Failed to refresh plans'))
    } catch {
      toast.error('Failed to create benefit plan')
    } finally {
      setSubmittingPlan(false)
    }
  }

  const handleAddEnrollment = async () => {
    if (!enrollForm.employee_id || !enrollForm.plan_id || !enrollForm.start_date) return
    setSubmittingEnrollment(true)
    try {
      await createBenefitEnrollment({
        ...enrollForm,
        employee_contribution: parseFloat(enrollForm.employee_contribution) || 0,
        employer_contribution: parseFloat(enrollForm.employer_contribution) || 0,
      })
      setShowAddEnrollment(false)
      setEnrollForm({ employee_id: '', plan_id: '', start_date: '', coverage_level: 'employee', employee_contribution: '', employer_contribution: '' })
      toast.success('Employee enrolled successfully')
      fetchBenefitEnrollments().then(setEnrollments).catch(() => toast.error('Failed to refresh enrollments'))
      fetchBenefitPlans().then(setPlans).catch(() => {})
    } catch {
      toast.error('Failed to enroll employee')
    } finally {
      setSubmittingEnrollment(false)
    }
  }

  const handleEditEnrollment = async () => {
    if (!editingEnrollment) return
    setEditingEnrollmentSubmitting(true)
    try {
      await updateBenefitEnrollment(editingEnrollment.id, {
        coverage_level: editEnrollForm.coverage_level,
        employee_contribution: parseFloat(editEnrollForm.employee_contribution) || 0,
        employer_contribution: parseFloat(editEnrollForm.employer_contribution) || 0,
      })
      toast.success('Enrollment updated')
      setEditingEnrollment(null)
      fetchBenefitEnrollments().then(setEnrollments).catch(() => {})
      fetchBenefitPlans().then(setPlans).catch(() => {})
      if (selectedPlan) {
        fetchBenefitEnrollments({ plan_id: selectedPlan.id }).then(setPlanEnrollments).catch(() => {})
      }
    } catch {
      toast.error('Failed to update enrollment')
    } finally {
      setEditingEnrollmentSubmitting(false)
    }
  }

  const handleUnenroll = async () => {
    if (!unenrollId) return
    setUnenrolling(true)
    try {
      await updateBenefitEnrollment(unenrollId, { status: 'cancelled', end_date: new Date().toISOString().split('T')[0] })
      toast.success('Employee unenrolled')
      setUnenrollId(null)
      fetchBenefitEnrollments().then(setEnrollments).catch(() => {})
      fetchBenefitPlans().then(setPlans).catch(() => {})
      if (selectedPlan) {
        fetchBenefitEnrollments({ plan_id: selectedPlan.id }).then(setPlanEnrollments).catch(() => {})
      }
    } catch {
      toast.error('Failed to unenroll employee')
    } finally {
      setUnenrolling(false)
    }
  }

  const handleDeactivatePlan = async () => {
    if (!deactivatePlanId) return
    setDeactivating(true)
    try {
      await updateBenefitPlan(deactivatePlanId, { is_active: 0 })
      toast.success('Plan deactivated')
      setDeactivatePlanId(null)
      fetchBenefitPlans().then(setPlans).catch(() => {})
      if (selectedPlan?.id === deactivatePlanId) {
        setSelectedPlan(null)
      }
    } catch {
      toast.error('Failed to deactivate plan')
    } finally {
      setDeactivating(false)
    }
  }

  const handlePlanEnroll = async () => {
    if (!planEnrollForm.employee_id || !planEnrollForm.start_date || !selectedPlan) return
    setPlanEnrolling(true)
    try {
      await createBenefitEnrollment({
        employee_id: planEnrollForm.employee_id,
        plan_id: selectedPlan.id,
        start_date: planEnrollForm.start_date,
        coverage_level: planEnrollForm.coverage_level,
        employee_contribution: parseFloat(planEnrollForm.employee_contribution) || 0,
        employer_contribution: parseFloat(planEnrollForm.employer_contribution) || 0,
      })
      toast.success('Employee enrolled')
      setShowPlanEnroll(false)
      setPlanEnrollForm({ employee_id: '', start_date: '', coverage_level: 'employee', employee_contribution: '', employer_contribution: '' })
      fetchBenefitEnrollments().then(setEnrollments).catch(() => {})
      fetchBenefitPlans().then(setPlans).catch(() => {})
      fetchBenefitEnrollments({ plan_id: selectedPlan.id }).then(setPlanEnrollments).catch(() => {})
    } catch {
      toast.error('Failed to enroll employee')
    } finally {
      setPlanEnrolling(false)
    }
  }

  const openEditEnrollment = (enrollment: BenefitEnrollment) => {
    setEditingEnrollment(enrollment)
    setEditEnrollForm({
      coverage_level: enrollment.coverage_level,
      employee_contribution: String(enrollment.employee_contribution),
      employer_contribution: String(enrollment.employer_contribution),
    })
  }

  const enrollmentColumns = [
    { key: 'employee_name', header: 'Employee', render: (e: BenefitEnrollment) => e.employee_id ? <EmployeeLink employeeId={e.employee_id} name={e.employee_name || 'Unknown'} /> : <span className="text-white">{'\u2014'}</span> },
    { key: 'plan_name', header: 'Plan', render: (e: BenefitEnrollment) => (
      <span className="text-gray-400">
        {e.plan_name || '\u2014'}
        {e.plan_type && (
          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-xs bg-purple-600/20 text-purple-400">
            {planTypeLabel[e.plan_type] || e.plan_type}
          </span>
        )}
      </span>
    )},
    { key: 'coverage_level', header: 'Coverage', className: 'hidden md:table-cell', render: (e: BenefitEnrollment) => <span className="text-gray-400">{coverageLabel[e.coverage_level] || e.coverage_level}</span> },
    { key: 'employee_contribution', header: 'Employee $', className: 'hidden lg:table-cell', render: (e: BenefitEnrollment) => <span className="text-gray-400">{formatCurrency(e.employee_contribution)}</span> },
    { key: 'employer_contribution', header: 'Employer $', className: 'hidden lg:table-cell', render: (e: BenefitEnrollment) => <span className="text-gray-400">{formatCurrency(e.employer_contribution)}</span> },
    { key: 'status', header: 'Status', render: (e: BenefitEnrollment) => <StatusBadge status={e.status} /> },
    { key: 'actions', header: '', render: (e: BenefitEnrollment) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={(ev: React.MouseEvent) => { ev.stopPropagation(); openEditEnrollment(e) }}>Edit</Button>
        {e.status === 'active' && (
          <Button variant="ghost" size="sm" onClick={(ev: React.MouseEvent) => { ev.stopPropagation(); setUnenrollId(e.id) }} className="text-red-400">Unenroll</Button>
        )}
      </div>
    )},
  ]

  const planEnrollmentColumns = [
    { key: 'employee_name', header: 'Employee', render: (e: BenefitEnrollment) => e.employee_id ? <EmployeeLink employeeId={e.employee_id} name={e.employee_name || 'Unknown'} className="font-medium" /> : <span className="text-white font-medium">{'\u2014'}</span> },
    { key: 'coverage_level', header: 'Coverage', render: (e: BenefitEnrollment) => <span className="text-gray-400">{coverageLabel[e.coverage_level] || e.coverage_level}</span> },
    { key: 'employee_contribution', header: 'Employee $', className: 'hidden md:table-cell', render: (e: BenefitEnrollment) => <span className="text-gray-400">{formatCurrency(e.employee_contribution)}</span> },
    { key: 'employer_contribution', header: 'Employer $', className: 'hidden md:table-cell', render: (e: BenefitEnrollment) => <span className="text-gray-400">{formatCurrency(e.employer_contribution)}</span> },
    { key: 'status', header: 'Status', render: (e: BenefitEnrollment) => <StatusBadge status={e.status} /> },
    { key: 'actions', header: '', render: (e: BenefitEnrollment) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" onClick={(ev: React.MouseEvent) => { ev.stopPropagation(); openEditEnrollment(e) }}>Edit</Button>
        {e.status === 'active' && (
          <Button variant="ghost" size="sm" onClick={(ev: React.MouseEvent) => { ev.stopPropagation(); setUnenrollId(e.id) }} className="text-red-400">Unenroll</Button>
        )}
      </div>
    )},
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Benefits" />
        <PageSkeleton />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Benefits"
        actions={
          <Button onClick={() => tab === 'plans' ? setShowAddPlan(true) : setShowAddEnrollment(true)}>
            {tab === 'plans' ? 'Add Plan' : 'Enroll Employee'}
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Plans" value={activePlans.length} />
        <StatCard label="Active Enrollments" value={activeEnrollments.length} color="blue" />
        <StatCard label="Monthly Employer Cost" value={formatCurrency(totalEmployerCost)} color="green" />
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <Tabs
          tabs={[
            { key: 'plans', label: 'Plans', count: plans.length },
            { key: 'enrollments', label: 'Enrollments', count: enrollments.length },
          ]}
          active={tab}
          onChange={(t) => { setTab(t); setSelectedPlan(null) }}
          variant="pills"
        />
      </div>

      {/* Add Plan modal */}
      <Modal
        open={showAddPlan}
        onClose={() => setShowAddPlan(false)}
        title="Add Benefit Plan"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddPlan(false)} disabled={submittingPlan}>Cancel</Button>
            <Button onClick={handleAddPlan} loading={submittingPlan}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Plan Name" required>
            <Input
              type="text"
              value={planForm.name}
              onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
              placeholder="Plan Name"
            />
          </FormField>
          <FormField label="Type" required>
            <Select
              value={planForm.type}
              onChange={e => setPlanForm({ ...planForm, type: e.target.value })}
              options={[
                { value: 'health', label: 'Health' },
                { value: 'dental', label: 'Dental' },
                { value: 'vision', label: 'Vision' },
                { value: 'life', label: 'Life' },
                { value: 'retirement', label: 'Retirement' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </FormField>
          <FormField label="Provider">
            <Input
              type="text"
              value={planForm.provider}
              onChange={e => setPlanForm({ ...planForm, provider: e.target.value })}
              placeholder="Provider (optional)"
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={planForm.description}
              onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
              placeholder="Description (optional)"
              rows={2}
            />
          </FormField>
        </div>
      </Modal>

      {/* Add Enrollment modal */}
      <Modal
        open={showAddEnrollment}
        onClose={() => setShowAddEnrollment(false)}
        title="Enroll Employee"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddEnrollment(false)} disabled={submittingEnrollment}>Cancel</Button>
            <Button onClick={handleAddEnrollment} loading={submittingEnrollment}>Enroll</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Employee" required>
            <Select
              value={enrollForm.employee_id}
              onChange={e => setEnrollForm({ ...enrollForm, employee_id: e.target.value })}
              placeholder="Select Employee"
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          <FormField label="Plan" required>
            <Select
              value={enrollForm.plan_id}
              onChange={e => setEnrollForm({ ...enrollForm, plan_id: e.target.value })}
              placeholder="Select Plan"
              options={activePlans.map(plan => ({ value: plan.id, label: `${plan.name} (${planTypeLabel[plan.type] || plan.type})` }))}
            />
          </FormField>
          <FormField label="Start Date" required>
            <Input
              type="date"
              value={enrollForm.start_date}
              onChange={e => setEnrollForm({ ...enrollForm, start_date: e.target.value })}
            />
          </FormField>
          <FormField label="Coverage Level">
            <Select
              value={enrollForm.coverage_level}
              onChange={e => setEnrollForm({ ...enrollForm, coverage_level: e.target.value })}
              options={[
                { value: 'employee', label: 'Employee Only' },
                { value: 'employee_spouse', label: 'Employee + Spouse' },
                { value: 'family', label: 'Family' },
              ]}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Employee $/mo">
              <Input
                type="number"
                value={enrollForm.employee_contribution}
                onChange={e => setEnrollForm({ ...enrollForm, employee_contribution: e.target.value })}
                placeholder="Employee $/mo"
              />
            </FormField>
            <FormField label="Employer $/mo">
              <Input
                type="number"
                value={enrollForm.employer_contribution}
                onChange={e => setEnrollForm({ ...enrollForm, employer_contribution: e.target.value })}
                placeholder="Employer $/mo"
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Plans tab */}
      {tab === 'plans' && (
        <>
          {plans.length === 0 ? (
            <EmptyState message="No benefit plans yet" icon="🏥" action="Add Plan" onAction={() => setShowAddPlan(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`bg-gray-900 border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer ${
                    selectedPlan?.id === plan.id ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-gray-800'
                  }`}
                >
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
          )}

          {/* Plan detail panel */}
          {selectedPlan && (
            <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>
                    &larr; Back
                  </Button>
                  <h2 className="text-lg font-bold text-white">{selectedPlan.name}</h2>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-600/20 text-purple-400">
                    {planTypeLabel[selectedPlan.type] || selectedPlan.type}
                  </span>
                  <StatusBadge status={selectedPlan.is_active ? 'active' : 'inactive'} />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => setShowPlanEnroll(true)}>Enroll Employee</Button>
                  {selectedPlan.is_active ? (
                    <Button variant="danger" size="sm" onClick={() => setDeactivatePlanId(selectedPlan.id)}>Deactivate</Button>
                  ) : (
                    <Button size="sm" onClick={async () => {
                      try {
                        await updateBenefitPlan(selectedPlan.id, { is_active: 1 })
                        toast.success('Plan reactivated')
                        fetchBenefitPlans().then(setPlans).catch(() => {})
                        setSelectedPlan({ ...selectedPlan, is_active: 1 })
                      } catch { toast.error('Failed to reactivate plan') }
                    }}>Reactivate</Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400 mb-4">
                {selectedPlan.provider && (
                  <span>Provider: <span className="text-white">{selectedPlan.provider}</span></span>
                )}
                <span>Active enrollments: <span className="text-white">{selectedPlan.active_enrollments}</span></span>
              </div>

              {selectedPlan.description && (
                <p className="text-gray-400 text-sm mb-4">{selectedPlan.description}</p>
              )}

              <h3 className="text-sm font-semibold text-gray-300 mb-3">Enrolled employees</h3>
              {detailLoading ? (
                <SkeletonTable rows={3} cols={5} />
              ) : (
                <DataTable
                  columns={planEnrollmentColumns}
                  data={planEnrollments}
                  keyField="id"
                  emptyMessage="No enrollments for this plan"
                  emptyIcon="📋"
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Enrollments tab */}
      {tab === 'enrollments' && (
        <DataTable
          columns={enrollmentColumns}
          data={enrollments}
          keyField="id"
          emptyMessage="No enrollments yet"
          emptyIcon="📋"
          emptyAction="Enroll Employee"
          onEmptyAction={() => setShowAddEnrollment(true)}
        />
      )}

      {/* Edit enrollment modal */}
      <Modal
        open={!!editingEnrollment}
        onClose={() => setEditingEnrollment(null)}
        title="Edit Enrollment"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingEnrollment(null)} disabled={editingEnrollmentSubmitting}>Cancel</Button>
            <Button onClick={handleEditEnrollment} loading={editingEnrollmentSubmitting}>Save Changes</Button>
          </>
        }
      >
        <div className="space-y-3">
          {editingEnrollment && (
            <div className="text-sm text-gray-400 mb-2">
              {editingEnrollment.employee_name} &mdash; {editingEnrollment.plan_name}
            </div>
          )}
          <FormField label="Coverage Level">
            <Select
              value={editEnrollForm.coverage_level}
              onChange={e => setEditEnrollForm({ ...editEnrollForm, coverage_level: e.target.value })}
              options={[
                { value: 'employee', label: 'Employee Only' },
                { value: 'employee_spouse', label: 'Employee + Spouse' },
                { value: 'family', label: 'Family' },
              ]}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Employee $/mo">
              <Input
                type="number"
                value={editEnrollForm.employee_contribution}
                onChange={e => setEditEnrollForm({ ...editEnrollForm, employee_contribution: e.target.value })}
              />
            </FormField>
            <FormField label="Employer $/mo">
              <Input
                type="number"
                value={editEnrollForm.employer_contribution}
                onChange={e => setEditEnrollForm({ ...editEnrollForm, employer_contribution: e.target.value })}
              />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Unenroll confirmation */}
      <ConfirmDialog
        open={!!unenrollId}
        onClose={() => setUnenrollId(null)}
        onConfirm={handleUnenroll}
        title="Unenroll Employee"
        message="Are you sure you want to cancel this enrollment? The employee will be unenrolled from the benefit plan."
        confirmLabel="Unenroll"
        variant="danger"
        loading={unenrolling}
      />

      {/* Deactivate plan confirmation */}
      <ConfirmDialog
        open={!!deactivatePlanId}
        onClose={() => setDeactivatePlanId(null)}
        onConfirm={handleDeactivatePlan}
        title="Deactivate Plan"
        message="Are you sure you want to deactivate this benefit plan? No new enrollments will be possible."
        confirmLabel="Deactivate"
        variant="danger"
        loading={deactivating}
      />

      {/* Enroll from plan detail */}
      <Modal
        open={showPlanEnroll}
        onClose={() => setShowPlanEnroll(false)}
        title={`Enroll in ${selectedPlan?.name || 'Plan'}`}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPlanEnroll(false)} disabled={planEnrolling}>Cancel</Button>
            <Button onClick={handlePlanEnroll} loading={planEnrolling}>Enroll</Button>
          </>
        }
      >
        <div className="space-y-3">
          <FormField label="Employee" required>
            <Select
              value={planEnrollForm.employee_id}
              onChange={e => setPlanEnrollForm({ ...planEnrollForm, employee_id: e.target.value })}
              placeholder="Select Employee"
              options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))}
            />
          </FormField>
          <FormField label="Start Date" required>
            <Input
              type="date"
              value={planEnrollForm.start_date}
              onChange={e => setPlanEnrollForm({ ...planEnrollForm, start_date: e.target.value })}
            />
          </FormField>
          <FormField label="Coverage Level">
            <Select
              value={planEnrollForm.coverage_level}
              onChange={e => setPlanEnrollForm({ ...planEnrollForm, coverage_level: e.target.value })}
              options={[
                { value: 'employee', label: 'Employee Only' },
                { value: 'employee_spouse', label: 'Employee + Spouse' },
                { value: 'family', label: 'Family' },
              ]}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Employee $/mo">
              <Input
                type="number"
                value={planEnrollForm.employee_contribution}
                onChange={e => setPlanEnrollForm({ ...planEnrollForm, employee_contribution: e.target.value })}
              />
            </FormField>
            <FormField label="Employer $/mo">
              <Input
                type="number"
                value={planEnrollForm.employer_contribution}
                onChange={e => setPlanEnrollForm({ ...planEnrollForm, employer_contribution: e.target.value })}
              />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  )
}
