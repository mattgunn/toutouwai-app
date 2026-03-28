import { useState, useEffect } from 'react'
import { fetchLeaveRequests, updateLeaveRequestStatus } from '../api'
import type { LeaveRequest } from '../types'
import StatusBadge from '../components/StatusBadge'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { FormField, Textarea } from '../components/FormField'
import { useToast } from '../components/Toast'
import { formatDate } from '../utils/format'

const STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected'] as const

export default function LeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const toast = useToast()

  const loadData = () => {
    setLoading(true)
    fetchLeaveRequests()
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    try {
      await updateLeaveRequestStatus(id, 'approved')
      toast.success('Leave request approved')
      loadData()
    } catch {
      toast.error('Failed to approve leave request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!rejectId) return
    setActionLoading(rejectId)
    try {
      await updateLeaveRequestStatus(rejectId, 'rejected')
      toast.success('Leave request rejected')
      setRejectId(null)
      setRejectReason('')
      loadData()
    } catch {
      toast.error('Failed to reject leave request')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter)

  const columns = [
    { key: 'employee_name', header: 'Employee', render: (req: LeaveRequest) => <span className="text-white">{req.employee_name || '\u2014'}</span> },
    { key: 'leave_type_name', header: 'Type', render: (req: LeaveRequest) => <span className="text-gray-400">{req.leave_type_name || '\u2014'}</span> },
    { key: 'start_date', header: 'Start', render: (req: LeaveRequest) => <span className="text-gray-400">{formatDate(req.start_date)}</span> },
    { key: 'end_date', header: 'End', render: (req: LeaveRequest) => <span className="text-gray-400">{formatDate(req.end_date)}</span> },
    { key: 'days', header: 'Days', render: (req: LeaveRequest) => <span className="text-white">{req.days}</span> },
    { key: 'status', header: 'Status', render: (req: LeaveRequest) => <StatusBadge status={req.status} /> },
    {
      key: '_actions',
      header: 'Actions',
      render: (req: LeaveRequest) => {
        if (req.status !== 'pending') return null
        const isLoading = actionLoading === req.id
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleApprove(req.id) }}
              loading={isLoading}
              disabled={!!actionLoading}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setRejectId(req.id) }}
              disabled={!!actionLoading}
            >
              Reject
            </Button>
          </div>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Leave Requests" />
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Leave Requests" />

      {/* Status filter pills */}
      <div className="flex items-center gap-2 mb-4">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span className="ml-1.5 text-[10px] opacity-70">
                {requests.filter(r => r.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyField="id"
        emptyIcon="🏖"
        emptyMessage="No leave requests"
        striped
      />

      <Modal
        open={!!rejectId}
        onClose={() => { setRejectId(null); setRejectReason('') }}
        title="Reject Leave Request"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setRejectId(null); setRejectReason('') }} disabled={!!actionLoading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} loading={!!actionLoading}>
              Reject
            </Button>
          </>
        }
      >
        <FormField label="Reason for rejection">
          <Textarea
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Optional reason..."
          />
        </FormField>
      </Modal>
    </div>
  )
}
