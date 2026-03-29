import { useState, useEffect, useMemo } from 'react'
import { fetchLeaveBalances, fetchLeaveRequests } from '../api'
import type { LeaveBalance, LeaveRequest } from '../types'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import Button from '../components/Button'
import StatusBadge from '../components/StatusBadge'
import { formatDate } from '../utils/format'
import EmployeeLink from '../components/EmployeeLink'
import { useToast } from '../components/Toast'

export default function LeaveBalances() {
  const toast = useToast()
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Detail modal state
  const [selectedBalance, setSelectedBalance] = useState<LeaveBalance | null>(null)
  const [empRequests, setEmpRequests] = useState<LeaveRequest[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    fetchLeaveBalances()
      .then(setBalances)
      .catch(() => toast.error('Failed to load leave balances'))
      .finally(() => setLoading(false))
  }, [])

  // Fetch leave requests when a balance row is selected
  useEffect(() => {
    if (!selectedBalance) return
    setDetailLoading(true)
    fetchLeaveRequests({ employee_id: selectedBalance.employee_id })
      .then(setEmpRequests)
      .catch(() => setEmpRequests([]))
      .finally(() => setDetailLoading(false))
  }, [selectedBalance])

  const filtered = useMemo(() => {
    if (!search.trim()) return balances
    const q = search.toLowerCase()
    return balances.filter(b => (b.employee_name || '').toLowerCase().includes(q))
  }, [balances, search])

  const columns = [
    { key: 'employee_name', header: 'Employee', render: (bal: LeaveBalance) => bal.employee_id ? <EmployeeLink employeeId={bal.employee_id} name={bal.employee_name || 'Unknown'} /> : <span className="text-white">{'\u2014'}</span> },
    { key: 'leave_type_name', header: 'Leave Type', render: (bal: LeaveBalance) => <span className="text-gray-400">{bal.leave_type_name || '\u2014'}</span> },
    { key: 'entitled', header: 'Entitled', render: (bal: LeaveBalance) => <span className="text-gray-400">{bal.entitled}</span> },
    { key: 'used', header: 'Used', render: (bal: LeaveBalance) => <span className="text-gray-400">{bal.used}</span> },
    { key: 'remaining', header: 'Remaining', render: (bal: LeaveBalance) => (
      <span className={`font-medium ${bal.remaining <= 0 ? 'text-red-400' : bal.remaining <= 3 ? 'text-amber-400' : 'text-emerald-400'}`}>
        {bal.remaining}
      </span>
    )},
  ]

  const requestColumns = [
    { key: 'leave_type_name', header: 'Type', render: (req: LeaveRequest) => <span className="text-gray-400">{req.leave_type_name || '\u2014'}</span> },
    { key: 'start_date', header: 'Start', render: (req: LeaveRequest) => <span className="text-gray-400">{formatDate(req.start_date)}</span> },
    { key: 'end_date', header: 'End', render: (req: LeaveRequest) => <span className="text-gray-400">{formatDate(req.end_date)}</span> },
    { key: 'days', header: 'Days', render: (req: LeaveRequest) => <span className="text-white">{req.days}</span> },
    { key: 'status', header: 'Status', render: (req: LeaveRequest) => <StatusBadge status={req.status} /> },
  ]

  if (loading) {
    return (
      <div>
        <PageHeader title="Leave Balances" />
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Leave Balances" />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by employee name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered.map((b) => ({ ...b, _key: `${b.employee_id}-${b.leave_type_id}` }))}
        keyField="_key"
        emptyIcon="📊"
        emptyMessage="No leave balance data"
        striped
        onRowClick={(row) => setSelectedBalance(row as LeaveBalance & { _key: string })}
      />

      {/* Employee leave requests detail modal */}
      <Modal
        open={!!selectedBalance}
        onClose={() => setSelectedBalance(null)}
        title={`Leave Details \u2014 ${selectedBalance?.employee_name || ''}`}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setSelectedBalance(null)}>Close</Button>
        }
      >
        {selectedBalance && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Leave Type</p>
                <p className="text-sm text-white font-medium">{selectedBalance.leave_type_name}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Entitled</p>
                <p className="text-sm text-white font-medium">{selectedBalance.entitled}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Used</p>
                <p className="text-sm text-white font-medium">{selectedBalance.used}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Remaining</p>
                <p className={`text-sm font-medium ${selectedBalance.remaining <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>{selectedBalance.remaining}</p>
              </div>
            </div>

            <h4 className="text-sm font-semibold text-gray-300">Leave Requests</h4>
            {detailLoading ? (
              <SkeletonTable rows={3} cols={5} />
            ) : (
              <DataTable
                columns={requestColumns}
                data={empRequests}
                keyField="id"
                emptyMessage="No leave requests found"
                emptyIcon="📋"
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
