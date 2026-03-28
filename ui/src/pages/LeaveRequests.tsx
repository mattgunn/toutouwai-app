import { useState, useEffect } from 'react'
import { fetchLeaveRequests } from '../api'
import type { LeaveRequest } from '../types'
import StatusBadge from '../components/StatusBadge'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function LeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaveRequests()
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'employee_name', header: 'Employee', render: (req: LeaveRequest) => <span className="text-white">{req.employee_name || '\u2014'}</span> },
    { key: 'leave_type_name', header: 'Type', render: (req: LeaveRequest) => <span className="text-gray-400">{req.leave_type_name || '\u2014'}</span> },
    { key: 'start_date', header: 'Start', render: (req: LeaveRequest) => <span className="text-gray-400">{req.start_date}</span> },
    { key: 'end_date', header: 'End', render: (req: LeaveRequest) => <span className="text-gray-400">{req.end_date}</span> },
    { key: 'days', header: 'Days', render: (req: LeaveRequest) => <span className="text-white">{req.days}</span> },
    { key: 'status', header: 'Status', render: (req: LeaveRequest) => <StatusBadge status={req.status} /> },
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

      <DataTable
        columns={columns}
        data={requests}
        keyField="id"
        emptyIcon="🏖"
        emptyMessage="No leave requests"
        striped
      />
    </div>
  )
}
