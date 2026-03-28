import { useState, useEffect } from 'react'
import { fetchLeaveBalances } from '../api'
import type { LeaveBalance } from '../types'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'

export default function LeaveBalances() {
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaveBalances()
      .then(setBalances)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const columns = [
    { key: 'employee_name', header: 'Employee', render: (bal: LeaveBalance) => <span className="text-white">{bal.employee_name || '\u2014'}</span> },
    { key: 'leave_type_name', header: 'Leave Type', render: (bal: LeaveBalance) => <span className="text-gray-400">{bal.leave_type_name || '\u2014'}</span> },
    { key: 'entitled', header: 'Entitled', render: (bal: LeaveBalance) => <span className="text-gray-400">{bal.entitled}</span> },
    { key: 'used', header: 'Used', render: (bal: LeaveBalance) => <span className="text-gray-400">{bal.used}</span> },
    { key: 'remaining', header: 'Remaining', render: (bal: LeaveBalance) => <span className="text-emerald-400 font-medium">{bal.remaining}</span> },
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

      <DataTable
        columns={columns}
        data={balances}
        emptyIcon="📊"
        emptyMessage="No leave balance data"
        striped
      />
    </div>
  )
}
