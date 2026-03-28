import { useState, useEffect } from 'react'
import { fetchLeaveBalances } from '../api'
import type { LeaveBalance } from '../types'
import EmptyState from '../components/EmptyState'
import { SkeletonTable } from '../components/Skeleton'
export default function LeaveBalances() {
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaveBalances()
      .then(setBalances)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <h1 className="text-xl font-bold text-white mb-4">Leave Balances</h1>
        <SkeletonTable rows={5} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Leave Balances</h1>

      {balances.length === 0 ? (
        <EmptyState icon="📊" message="No leave balance data" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Leave Type</th>
                <th className="px-4 py-3">Entitled</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((bal, i) => (
                <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white">{bal.employee_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400">{bal.leave_type_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400">{bal.entitled}</td>
                  <td className="px-4 py-3 text-gray-400">{bal.used}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">{bal.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
