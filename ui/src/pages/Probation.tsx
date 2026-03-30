import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchProbations,
  createProbation,
  updateProbation,
  deleteProbation,
} from '../modules/probation/api'
import { fetchEmployees } from '../modules/employees/api'
import type { ProbationPeriod } from '../modules/probation/types'
import type { Employee } from '../modules/employees/types'
import StatusBadge from '../components/StatusBadge'
import EmployeeLink from '../components/EmployeeLink'
import Button from '../components/Button'
import { FormField, Input, Select, Textarea } from '../components/FormField'
import Tabs from '../components/Tabs'
import Modal from '../components/Modal'
import { SkeletonTable } from '../components/Skeleton'
import ConfirmDialog from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function Probation() {
  const toast = useToast()
  const [probations, setProbations] = useState<ProbationPeriod[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ProbationPeriod | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [p, emp] = await Promise.all([
        fetchProbations(),
        fetchEmployees(),
      ])
      setProbations(p)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load probation data')
    } finally {
      setLoading(false)
    }
  }

  const reloadProbations = () => fetchProbations().then(setProbations).catch(() => toast.error('Failed to reload probations'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteProbation(deleteConfirm.id)
      toast.success('Probation record deleted')
      reloadProbations()
    } catch {
      toast.error('Failed to delete probation record')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const filteredProbations = statusFilter === 'all'
    ? probations
    : probations.filter(p => p.status === statusFilter)

  if (loading) {
    return (
      <div>
        <PageHeader title="Probation" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Probation"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Probation</Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'active', 'extended', 'completed', 'failed'].map(s => (
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
          { key: 'employee_name', header: 'Employee', render: (row) => <EmployeeLink employeeId={String(row.employee_id)} name={String(row.employee_name)} /> },
          { key: 'start_date', header: 'Start Date', render: (row) => <span className="text-gray-400">{row.start_date ? formatDate(String(row.start_date)) : '-'}</span> },
          { key: 'end_date', header: 'End Date', render: (row) => <span className="text-gray-400">{row.end_date ? formatDate(String(row.end_date)) : '-'}</span> },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
          { key: 'review_date', header: 'Review Date', render: (row) => <span className="text-gray-400">{row.review_date ? formatDate(String(row.review_date)) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'outcome', header: 'Outcome', render: (row) => <span className="text-gray-400 capitalize">{String(row.outcome || '-')}</span>, className: 'hidden lg:table-cell' },
        ]}
        data={filteredProbations as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const p = probations.find(pr => pr.id === row.id)
          if (p) { setEditing(p); setShowModal(true) }
        }}
        emptyIcon="📅"
        emptyMessage="No probation records found"
        emptyAction="Add Probation"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <ProbationModal
        open={showModal}
        probation={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadProbations() }}
        onDelete={(p) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: p.id, name: p.employee_name }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Probation Record"
        message={`Are you sure you want to delete the probation record for "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Probation Modal ---

function ProbationModal({
  open,
  probation,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  probation: ProbationPeriod | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (p: ProbationPeriod) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('active')
  const [reviewDate, setReviewDate] = useState('')
  const [outcome, setOutcome] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(probation?.employee_id ?? '')
      setStartDate(probation?.start_date ?? '')
      setEndDate(probation?.end_date ?? '')
      setStatus(probation?.status ?? 'active')
      setReviewDate(probation?.review_date ?? '')
      setOutcome(probation?.outcome ?? '')
      setNotes(probation?.notes ?? '')
    }
  }, [open, probation])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        review_date: reviewDate || null,
        outcome: outcome || null,
        notes: notes || null,
      }
      if (probation) {
        await updateProbation(probation.id, body)
        toast.success('Probation record updated')
      } else {
        await createProbation(body)
        toast.success('Probation record created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${probation ? 'update' : 'create'} probation record`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={probation ? 'Edit Probation' : 'Add Probation'} size="lg" footer={
      <>
        {probation && (
          <Button variant="danger" onClick={() => onDelete(probation)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId} loading={submitting}>
          {probation ? 'Save' : 'Create'}
        </Button>
      </>
    }>
      <div className="space-y-3">
        <FormField label="Employee" required>
          <Select
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
            options={[
              { value: '', label: 'Select employee...' },
              ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` })),
            ]}
            disabled={!!probation}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start Date">
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </FormField>
          <FormField label="End Date">
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)} options={[
              { value: 'active', label: 'Active' },
              { value: 'extended', label: 'Extended' },
              { value: 'completed', label: 'Completed' },
              { value: 'failed', label: 'Failed' },
            ]} />
          </FormField>
          <FormField label="Review Date">
            <Input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Outcome">
          <Select value={outcome} onChange={e => setOutcome(e.target.value)} options={[
            { value: '', label: 'Select outcome...' },
            { value: 'passed', label: 'Passed' },
            { value: 'extended', label: 'Extended' },
            { value: 'failed', label: 'Failed' },
            { value: 'terminated', label: 'Terminated' },
          ]} />
        </FormField>
        <FormField label="Notes">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" rows={3} />
        </FormField>
      </div>
    </Modal>
  )
}
