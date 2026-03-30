import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchDelegations,
  createDelegation,
  updateDelegation,
  deleteDelegation,
} from '../modules/delegations/api'
import { fetchUsers } from '../modules/settings/api'
import type { Delegation } from '../modules/delegations/types'
import type { User } from '../modules/settings/types'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function Delegations() {
  const toast = useToast()
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Delegation | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [d, u] = await Promise.all([
        fetchDelegations(),
        fetchUsers(),
      ])
      setDelegations(d)
      setUsers(u)
    } catch {
      toast.error('Failed to load delegations')
    } finally {
      setLoading(false)
    }
  }

  const reloadDelegations = () => fetchDelegations().then(setDelegations).catch(() => toast.error('Failed to reload delegations'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteDelegation(deleteConfirm.id)
      toast.success('Delegation deleted')
      reloadDelegations()
    } catch {
      toast.error('Failed to delete delegation')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Delegations" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Delegations"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Delegation</Button>
        }
      />

      <DataTable
        columns={[
          { key: 'delegator_name', header: 'Delegator', render: (row) => <span className="text-white font-medium">{String(row.delegator_name || '-')}</span> },
          { key: 'delegate_name', header: 'Delegate', render: (row) => <span className="text-white font-medium">{String(row.delegate_name || '-')}</span> },
          { key: 'entity_type', header: 'Entity Type', render: (row) => <span className="text-gray-400 capitalize">{String(row.entity_type).replace(/_/g, ' ')}</span> },
          { key: 'start_date', header: 'Start Date', render: (row) => <span className="text-gray-400">{row.start_date ? formatDate(String(row.start_date)) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'end_date', header: 'End Date', render: (row) => <span className="text-gray-400">{row.end_date ? formatDate(String(row.end_date)) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'is_active', header: 'Status', render: (row) => row.is_active ? <StatusBadge status="active" /> : <StatusBadge status="inactive" /> },
        ]}
        data={delegations as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const d = delegations.find(del => del.id === row.id)
          if (d) { setEditing(d); setShowModal(true) }
        }}
        emptyIcon="🔄"
        emptyMessage="No delegations yet"
        emptyAction="Add Delegation"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      {/* Delegation Modal */}
      <DelegationModal
        open={showModal}
        delegation={editing}
        users={users}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadDelegations() }}
        onDelete={(d) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: d.id, name: `${d.delegator_name} → ${d.delegate_name}` }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Delegation"
        message={`Are you sure you want to delete the delegation "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Delegation Modal ---

function DelegationModal({
  open,
  delegation,
  users,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  delegation: Delegation | null
  users: User[]
  onClose: () => void
  onSaved: () => void
  onDelete: (d: Delegation) => void
}) {
  const toast = useToast()
  const [delegatorId, setDelegatorId] = useState('')
  const [delegateId, setDelegateId] = useState('')
  const [entityType, setEntityType] = useState('leave_approval')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setDelegatorId(delegation?.delegator_id ?? '')
      setDelegateId(delegation?.delegate_id ?? '')
      setEntityType(delegation?.entity_type ?? 'leave_approval')
      setStartDate(delegation?.start_date ?? '')
      setEndDate(delegation?.end_date ?? '')
      setReason(delegation?.reason ?? '')
      setIsActive(delegation ? !!delegation.is_active : true)
    }
  }, [open, delegation])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        delegator_id: delegatorId,
        delegate_id: delegateId,
        entity_type: entityType,
        start_date: startDate,
        end_date: endDate || null,
        reason: reason || null,
        is_active: isActive ? 1 : 0,
      }
      if (delegation) {
        await updateDelegation(delegation.id, body)
        toast.success('Delegation updated')
      } else {
        await createDelegation(body)
        toast.success('Delegation created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${delegation ? 'update' : 'create'} delegation`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={delegation ? 'Edit Delegation' : 'Add Delegation'} size="lg" footer={
      <>
        {delegation && (
          <Button variant="danger" onClick={() => onDelete(delegation)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!delegatorId || !delegateId || !startDate} loading={submitting}>
          {delegation ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Delegator" required>
          <Select
            value={delegatorId}
            onChange={e => setDelegatorId(e.target.value)}
            options={[
              { value: '', label: 'Select user...' },
              ...users.map(u => ({ value: u.id, label: u.name })),
            ]}
          />
        </FormField>
        <FormField label="Delegate" required>
          <Select
            value={delegateId}
            onChange={e => setDelegateId(e.target.value)}
            options={[
              { value: '', label: 'Select user...' },
              ...users.filter(u => u.id !== delegatorId).map(u => ({ value: u.id, label: u.name })),
            ]}
          />
        </FormField>
        <FormField label="Entity Type" required>
          <Select value={entityType} onChange={e => setEntityType(e.target.value)} options={[
            { value: 'leave_approval', label: 'Leave Approval' },
            { value: 'expense_approval', label: 'Expense Approval' },
            { value: 'timesheet_approval', label: 'Timesheet Approval' },
            { value: 'document_signing', label: 'Document Signing' },
            { value: 'hiring_approval', label: 'Hiring Approval' },
            { value: 'other', label: 'Other' },
          ]} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Date" required>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="End Date">
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Reason">
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for delegation" rows={3} />
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
