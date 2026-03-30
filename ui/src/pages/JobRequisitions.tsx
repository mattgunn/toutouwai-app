import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchRequisitions,
  createRequisition,
  updateRequisition,
  deleteRequisition,
} from '../modules/job-requisitions/api'
import { fetchDepartments } from '../modules/departments/api'
import { fetchPositions } from '../modules/positions/api'
import type { JobRequisition } from '../modules/job-requisitions/types'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

interface Department {
  id: string
  name: string
}

interface Position {
  id: string
  title: string
}

export default function JobRequisitions() {
  const toast = useToast()
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<JobRequisition | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [r, d, p] = await Promise.all([
        fetchRequisitions(),
        fetchDepartments(),
        fetchPositions(),
      ])
      setRequisitions(r)
      setDepartments(d)
      setPositions(p)
    } catch {
      toast.error('Failed to load requisitions')
    } finally {
      setLoading(false)
    }
  }

  const reloadRequisitions = () => fetchRequisitions().then(setRequisitions).catch(() => toast.error('Failed to reload requisitions'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteRequisition(deleteConfirm.id)
      toast.success('Requisition deleted')
      reloadRequisitions()
    } catch {
      toast.error('Failed to delete requisition')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const filteredRequisitions = statusFilter === 'all'
    ? requisitions
    : requisitions.filter(r => r.status === statusFilter)

  const formatBudget = (min: unknown, max: unknown) => {
    if (!min && !max) return '-'
    const fmtNum = (n: unknown) => n != null ? `$${Number(n).toLocaleString()}` : ''
    if (min && max) return `${fmtNum(min)} - ${fmtNum(max)}`
    if (min) return `From ${fmtNum(min)}`
    return `Up to ${fmtNum(max)}`
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Job Requisitions" />
        <SkeletonTable rows={5} cols={7} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Job Requisitions"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>New Requisition</Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'draft', 'pending_approval', 'approved', 'open', 'on_hold', 'filled', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: 'title', header: 'Title', render: (row) => <span className="text-white font-medium">{String(row.title)}</span> },
          { key: 'department_name', header: 'Department', render: (row) => <span className="text-gray-400">{String(row.department_name || '-')}</span>, className: 'hidden md:table-cell' },
          { key: 'number_of_openings', header: 'Openings', render: (row) => <span className="text-gray-400">{String(row.number_of_openings ?? 1)}</span> },
          { key: 'priority', header: 'Priority', render: (row) => <StatusBadge status={String(row.priority)} /> },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          { key: 'budget', header: 'Budget', render: (row) => <span className="text-gray-400">{formatBudget(row.budget_min, row.budget_max)}</span>, className: 'hidden lg:table-cell' },
          { key: 'target_start_date', header: 'Target Start', render: (row) => <span className="text-gray-400">{row.target_start_date ? formatDate(String(row.target_start_date)) : '-'}</span>, className: 'hidden lg:table-cell' },
        ]}
        data={filteredRequisitions as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const r = requisitions.find(req => req.id === row.id)
          if (r) { setEditing(r); setShowModal(true) }
        }}
        emptyIcon="📄"
        emptyMessage="No requisitions found"
        emptyAction="New Requisition"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <RequisitionModal
        open={showModal}
        requisition={editing}
        departments={departments}
        positions={positions}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadRequisitions() }}
        onDelete={(r) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: r.id, name: r.title }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Requisition"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Requisition Modal ---

function RequisitionModal({
  open,
  requisition,
  departments,
  positions,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  requisition: JobRequisition | null
  departments: Department[]
  positions: Position[]
  onClose: () => void
  onSaved: () => void
  onDelete: (r: JobRequisition) => void
}) {
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [numberOfOpenings, setNumberOfOpenings] = useState('1')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('draft')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [targetStartDate, setTargetStartDate] = useState('')
  const [justification, setJustification] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setTitle(requisition?.title ?? '')
      setDepartmentId(requisition?.department_id ?? '')
      setPositionId(requisition?.position_id ?? '')
      setNumberOfOpenings(String(requisition?.number_of_openings ?? 1))
      setPriority(requisition?.priority ?? 'medium')
      setStatus(requisition?.status ?? 'draft')
      setBudgetMin(requisition?.budget_min != null ? String(requisition.budget_min) : '')
      setBudgetMax(requisition?.budget_max != null ? String(requisition.budget_max) : '')
      setTargetStartDate(requisition?.target_start_date ?? '')
      setJustification(requisition?.justification ?? '')
    }
  }, [open, requisition])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        title,
        department_id: departmentId || null,
        position_id: positionId || null,
        number_of_openings: parseInt(numberOfOpenings) || 1,
        priority,
        status,
        budget_min: budgetMin ? parseFloat(budgetMin) : null,
        budget_max: budgetMax ? parseFloat(budgetMax) : null,
        target_start_date: targetStartDate || null,
        justification: justification || null,
      }
      if (requisition) {
        await updateRequisition(requisition.id, body)
        toast.success('Requisition updated')
      } else {
        await createRequisition(body)
        toast.success('Requisition created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${requisition ? 'update' : 'create'} requisition`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={requisition ? 'Edit Requisition' : 'New Requisition'} size="lg" footer={
      <>
        {requisition && (
          <Button variant="danger" onClick={() => onDelete(requisition)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!title} loading={submitting}>
          {requisition ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Title" required>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Requisition title" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Department">
            <Select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              options={[
                { value: '', label: 'Select department...' },
                ...departments.map(d => ({ value: d.id, label: d.name })),
              ]}
            />
          </FormField>
          <FormField label="Position">
            <Select
              value={positionId}
              onChange={e => setPositionId(e.target.value)}
              options={[
                { value: '', label: 'Select position...' },
                ...positions.map(p => ({ value: p.id, label: p.title })),
              ]}
            />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="# of Openings">
            <Input type="number" value={numberOfOpenings} onChange={e => setNumberOfOpenings(e.target.value)} min="1" />
          </FormField>
          <FormField label="Priority">
            <Select value={priority} onChange={e => setPriority(e.target.value)} options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]} />
          </FormField>
          <FormField label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)} options={[
              { value: 'draft', label: 'Draft' },
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'approved', label: 'Approved' },
              { value: 'open', label: 'Open' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'filled', label: 'Filled' },
              { value: 'cancelled', label: 'Cancelled' },
            ]} />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Budget Min">
            <Input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="0" min="0" step="1000" />
          </FormField>
          <FormField label="Budget Max">
            <Input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="0" min="0" step="1000" />
          </FormField>
          <FormField label="Target Start Date">
            <Input type="date" value={targetStartDate} onChange={e => setTargetStartDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Justification">
          <Textarea value={justification} onChange={e => setJustification(e.target.value)} placeholder="Justification for this requisition" rows={4} />
        </FormField>
      </div>
    </Modal>
  )
}
