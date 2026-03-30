import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchAccrualPolicies,
  createAccrualPolicy,
  updateAccrualPolicy,
  deleteAccrualPolicy,
} from '../modules/leave-accrual/api'
import { fetchLeaveTypes } from '../modules/leave/api'
import type { LeaveAccrualPolicy } from '../modules/leave-accrual/types'
import type { LeaveType } from '../modules/leave/types'
import StatusBadge from '../components/StatusBadge'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function LeaveAccrualPolicies() {
  const toast = useToast()
  const [policies, setPolicies] = useState<LeaveAccrualPolicy[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<LeaveAccrualPolicy | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [p, lt] = await Promise.all([
        fetchAccrualPolicies(),
        fetchLeaveTypes(),
      ])
      setPolicies(p)
      setLeaveTypes(lt)
    } catch {
      toast.error('Failed to load accrual policies')
    } finally {
      setLoading(false)
    }
  }

  const reloadPolicies = () => fetchAccrualPolicies().then(setPolicies).catch(() => toast.error('Failed to reload policies'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteAccrualPolicy(deleteConfirm.id)
      toast.success('Policy deleted')
      reloadPolicies()
    } catch {
      toast.error('Failed to delete policy')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Leave Accrual Policies" />
        <SkeletonTable rows={5} cols={7} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Leave Accrual Policies"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Policy</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'name', header: 'Name', render: (row) => <span className="text-white font-medium">{String(row.name)}</span> },
          { key: 'leave_type_name', header: 'Leave Type', render: (row) => <span className="text-gray-400">{String(row.leave_type_name)}</span> },
          { key: 'accrual_rate', header: 'Accrual Rate', render: (row) => <span className="text-gray-400">{String(row.accrual_rate)}</span> },
          { key: 'accrual_frequency', header: 'Frequency', render: (row) => <span className="text-gray-400 capitalize">{String(row.accrual_frequency).replace(/_/g, ' ')}</span>, className: 'hidden md:table-cell' },
          { key: 'max_balance', header: 'Max Balance', render: (row) => <span className="text-gray-400">{row.max_balance != null ? String(row.max_balance) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'carry_over_limit', header: 'Carry Over', render: (row) => <span className="text-gray-400">{row.carry_over_limit != null ? String(row.carry_over_limit) : '-'}</span>, className: 'hidden lg:table-cell' },
          { key: 'is_active', header: 'Status', render: (row) => row.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" /> },
        ]}
        data={policies as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const p = policies.find(pol => pol.id === row.id)
          if (p) { setEditing(p); setShowModal(true) }
        }}
        emptyIcon="📊"
        emptyMessage="No accrual policies yet"
        emptyAction="Add Policy"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      {/* Policy Modal */}
      <PolicyModal
        open={showModal}
        policy={editing}
        leaveTypes={leaveTypes}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadPolicies() }}
        onDelete={(p) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: p.id, name: p.name }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Accrual Policy"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Policy Modal ---

function PolicyModal({
  open,
  policy,
  leaveTypes,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  policy: LeaveAccrualPolicy | null
  leaveTypes: LeaveType[]
  onClose: () => void
  onSaved: () => void
  onDelete: (p: LeaveAccrualPolicy) => void
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [accrualRate, setAccrualRate] = useState('')
  const [accrualFrequency, setAccrualFrequency] = useState('monthly')
  const [maxBalance, setMaxBalance] = useState('')
  const [carryOverLimit, setCarryOverLimit] = useState('')
  const [waitingPeriodDays, setWaitingPeriodDays] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setName(policy?.name ?? '')
      setLeaveTypeId(policy?.leave_type_id ?? '')
      setAccrualRate(policy ? String(policy.accrual_rate) : '')
      setAccrualFrequency(policy?.accrual_frequency ?? 'monthly')
      setMaxBalance(policy?.max_balance != null ? String(policy.max_balance) : '')
      setCarryOverLimit(policy?.carry_over_limit != null ? String(policy.carry_over_limit) : '')
      setWaitingPeriodDays(policy?.waiting_period_days != null ? String(policy.waiting_period_days) : '')
      setIsActive(policy ? !!policy.is_active : true)
    }
  }, [open, policy])

  const activeLeaveTypes = leaveTypes.filter(lt => lt.is_active)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        name,
        leave_type_id: leaveTypeId,
        accrual_rate: parseFloat(accrualRate) || 0,
        accrual_frequency: accrualFrequency,
        max_balance: maxBalance ? parseFloat(maxBalance) : null,
        carry_over_limit: carryOverLimit ? parseFloat(carryOverLimit) : null,
        waiting_period_days: waitingPeriodDays ? parseInt(waitingPeriodDays) : null,
        is_active: isActive ? 1 : 0,
      }
      if (policy) {
        await updateAccrualPolicy(policy.id, body)
        toast.success('Policy updated')
      } else {
        await createAccrualPolicy(body)
        toast.success('Policy created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${policy ? 'update' : 'create'} policy`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={policy ? 'Edit Accrual Policy' : 'Add Accrual Policy'} size="lg" footer={
      <>
        {policy && (
          <Button variant="danger" onClick={() => onDelete(policy)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!name || !leaveTypeId || !accrualRate} loading={submitting}>
          {policy ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Policy Name" required>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard PTO Accrual" />
        </FormField>
        <FormField label="Leave Type" required>
          <Select
            value={leaveTypeId}
            onChange={e => setLeaveTypeId(e.target.value)}
            options={[
              { value: '', label: 'Select leave type...' },
              ...activeLeaveTypes.map(lt => ({ value: lt.id, label: lt.name })),
            ]}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Accrual Rate (days)" required>
            <Input type="number" value={accrualRate} onChange={e => setAccrualRate(e.target.value)} placeholder="0" min="0" step="0.25" />
          </FormField>
          <FormField label="Accrual Frequency">
            <Select value={accrualFrequency} onChange={e => setAccrualFrequency(e.target.value)} options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'bi_weekly', label: 'Bi-Weekly' },
              { value: 'semi_monthly', label: 'Semi-Monthly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'annual', label: 'Annual' },
            ]} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Max Balance (days)">
            <Input type="number" value={maxBalance} onChange={e => setMaxBalance(e.target.value)} placeholder="No limit" min="0" step="0.5" />
          </FormField>
          <FormField label="Carry Over Limit (days)">
            <Input type="number" value={carryOverLimit} onChange={e => setCarryOverLimit(e.target.value)} placeholder="No limit" min="0" step="0.5" />
          </FormField>
        </div>
        <FormField label="Waiting Period (days)">
          <Input type="number" value={waitingPeriodDays} onChange={e => setWaitingPeriodDays(e.target.value)} placeholder="0" min="0" />
        </FormField>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
            Active
          </label>
        </div>
      </div>
    </Modal>
  )
}
