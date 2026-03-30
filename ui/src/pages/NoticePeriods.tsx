import { useState, useEffect } from 'react'
import { formatDate } from '../utils/format'
import {
  fetchNoticePeriods,
  createNoticePeriod,
  updateNoticePeriod,
  deleteNoticePeriod,
} from '../modules/notice-periods/api'
import { fetchEmployees } from '../modules/employees/api'
import type { NoticePeriod } from '../modules/notice-periods/types'
import type { Employee } from '../modules/employees/types'
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

export default function NoticePeriods() {
  const toast = useToast()
  const [noticePeriods, setNoticePeriods] = useState<NoticePeriod[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<NoticePeriod | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [np, emp] = await Promise.all([
        fetchNoticePeriods(),
        fetchEmployees(),
      ])
      setNoticePeriods(np)
      setEmployees(emp.employees)
    } catch {
      toast.error('Failed to load notice periods')
    } finally {
      setLoading(false)
    }
  }

  const reloadNoticePeriods = () => fetchNoticePeriods().then(setNoticePeriods).catch(() => toast.error('Failed to reload notice periods'))

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return
    setDeleteLoading(true)
    try {
      await deleteNoticePeriod(deleteConfirm.id)
      toast.success('Notice period deleted')
      reloadNoticePeriods()
    } catch {
      toast.error('Failed to delete notice period')
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(null)
    }
  }

  const filteredNoticePeriods = statusFilter === 'all'
    ? noticePeriods
    : noticePeriods.filter(np => np.status === statusFilter)

  if (loading) {
    return (
      <div>
        <PageHeader title="Notice Periods" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Notice Periods"
        actions={
          <Button onClick={() => { setEditing(null); setShowModal(true) }}>Add Notice</Button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all', 'pending', 'active', 'completed', 'withdrawn', 'cancelled'].map(s => (
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
          { key: 'notice_type', header: 'Type', render: (row) => <StatusBadge status={String(row.notice_type)} /> },
          { key: 'notice_date', header: 'Notice Date', render: (row) => <span className="text-gray-400">{row.notice_date ? formatDate(String(row.notice_date)) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'effective_date', header: 'Effective Date', render: (row) => <span className="text-gray-400">{row.effective_date ? formatDate(String(row.effective_date)) : '-'}</span>, className: 'hidden md:table-cell' },
          { key: 'last_working_day', header: 'Last Day', render: (row) => <span className="text-gray-400">{row.last_working_day ? formatDate(String(row.last_working_day)) : '-'}</span>, className: 'hidden lg:table-cell' },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={String(row.status)} /> },
        ]}
        data={filteredNoticePeriods as unknown as Record<string, unknown>[]}
        keyField="id"
        onRowClick={(row) => {
          const np = noticePeriods.find(n => n.id === row.id)
          if (np) { setEditing(np); setShowModal(true) }
        }}
        emptyIcon="📝"
        emptyMessage="No notice periods found"
        emptyAction="Add Notice"
        onEmptyAction={() => { setEditing(null); setShowModal(true) }}
      />

      <NoticePeriodModal
        open={showModal}
        noticePeriod={editing}
        employees={employees}
        onClose={() => { setShowModal(false); setEditing(null) }}
        onSaved={() => { setShowModal(false); setEditing(null); reloadNoticePeriods() }}
        onDelete={(np) => { setShowModal(false); setEditing(null); setDeleteConfirm({ id: np.id, name: np.employee_name }) }}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Notice Period"
        message={`Are you sure you want to delete the notice period for "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  )
}


// --- Notice Period Modal ---

function NoticePeriodModal({
  open,
  noticePeriod,
  employees,
  onClose,
  onSaved,
  onDelete,
}: {
  open: boolean
  noticePeriod: NoticePeriod | null
  employees: Employee[]
  onClose: () => void
  onSaved: () => void
  onDelete: (np: NoticePeriod) => void
}) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [noticeType, setNoticeType] = useState('resignation')
  const [noticeDate, setNoticeDate] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [lastWorkingDay, setLastWorkingDay] = useState('')
  const [status, setStatus] = useState('pending')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmployeeId(noticePeriod?.employee_id ?? '')
      setNoticeType(noticePeriod?.notice_type ?? 'resignation')
      setNoticeDate(noticePeriod?.notice_date ?? '')
      setEffectiveDate(noticePeriod?.effective_date ?? '')
      setLastWorkingDay(noticePeriod?.last_working_day ?? '')
      setStatus(noticePeriod?.status ?? 'pending')
      setReason(noticePeriod?.reason ?? '')
      setNotes(noticePeriod?.notes ?? '')
    }
  }, [open, noticePeriod])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const body = {
        employee_id: employeeId,
        notice_type: noticeType,
        notice_date: noticeDate || null,
        effective_date: effectiveDate || null,
        last_working_day: lastWorkingDay || null,
        status,
        reason: reason || null,
        notes: notes || null,
      }
      if (noticePeriod) {
        await updateNoticePeriod(noticePeriod.id, body)
        toast.success('Notice period updated')
      } else {
        await createNoticePeriod(body)
        toast.success('Notice period created')
      }
      onSaved()
    } catch {
      toast.error(`Failed to ${noticePeriod ? 'update' : 'create'} notice period`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={noticePeriod ? 'Edit Notice Period' : 'Add Notice Period'} size="lg" footer={
      <>
        {noticePeriod && (
          <Button variant="danger" onClick={() => onDelete(noticePeriod)} className="mr-auto">Delete</Button>
        )}
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!employeeId || !noticeDate || !effectiveDate} loading={submitting}>
          {noticePeriod ? 'Save' : 'Create'}
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
            disabled={!!noticePeriod}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Notice Type">
            <Select value={noticeType} onChange={e => setNoticeType(e.target.value)} options={[
              { value: 'resignation', label: 'Resignation' },
              { value: 'termination', label: 'Termination' },
              { value: 'retirement', label: 'Retirement' },
              { value: 'mutual', label: 'Mutual Separation' },
              { value: 'redundancy', label: 'Redundancy' },
            ]} />
          </FormField>
          <FormField label="Status">
            <Select value={status} onChange={e => setStatus(e.target.value)} options={[
              { value: 'pending', label: 'Pending' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Completed' },
              { value: 'withdrawn', label: 'Withdrawn' },
              { value: 'cancelled', label: 'Cancelled' },
            ]} />
          </FormField>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Notice Date">
            <Input type="date" value={noticeDate} onChange={e => setNoticeDate(e.target.value)} />
          </FormField>
          <FormField label="Effective Date">
            <Input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
          </FormField>
          <FormField label="Last Working Day">
            <Input type="date" value={lastWorkingDay} onChange={e => setLastWorkingDay(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Reason">
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for notice" rows={3} />
        </FormField>
        <FormField label="Notes">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" rows={3} />
        </FormField>
      </div>
    </Modal>
  )
}
