import { useState, useEffect } from 'react'
import { fetchBenefitPlans, createBenefitPlan, fetchBenefitEnrollments, createBenefitEnrollment } from '../modules/benefits/api'
import { fetchEmployees } from '../api'
import type { BenefitPlan, BenefitEnrollment } from '../modules/benefits/types'
import type { Employee } from '../types'
import StatusBadge from '../components/StatusBadge'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Tabs from '../components/Tabs'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import { PageSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'

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

  useEffect(() => {
    Promise.all([
      fetchBenefitPlans().then(setPlans),
      fetchBenefitEnrollments().then(setEnrollments),
      fetchEmployees().then(r => setEmployees(r.employees)),
    ])
      .catch(() => toast.error('Failed to load benefits data'))
      .finally(() => setLoading(false))
  }, [])

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

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Benefits</h1>
        </div>
        <PageSkeleton />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Benefits</h1>
        <Button onClick={() => tab === 'plans' ? setShowAddPlan(true) : setShowAddEnrollment(true)}>
          {tab === 'plans' ? 'Add Plan' : 'Enroll Employee'}
        </Button>
      </div>

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
          onChange={setTab}
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
        plans.length === 0 ? (
          <EmptyState message="No benefit plans yet" icon="🏥" action="Add Plan" onAction={() => setShowAddPlan(true)} />
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
          <EmptyState message="No enrollments yet" icon="📋" action="Enroll Employee" onAction={() => setShowAddEnrollment(true)} />
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
