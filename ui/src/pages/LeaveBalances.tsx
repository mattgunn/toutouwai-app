import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchLeaveBalances } from '../api'
import type { LeaveBalance } from '../types'
import { SkeletonTable } from '../components/Skeleton'
import PageHeader from '../components/PageHeader'
import DataTable from '../components/DataTable'
import EmployeeLink from '../components/EmployeeLink'

export default function LeaveBalances() {
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchLeaveBalances()
      .then(setBalances)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

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
        onRowClick={(row) => navigate(`/employees?id=${(row as LeaveBalance & { _key: string }).employee_id}`)}
      />
    </div>
  )
}
