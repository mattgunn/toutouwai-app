import { useState, useEffect } from 'react'
import { fetchLeaveRequests } from '../api'
import type { LeaveRequest } from '../types'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { SkeletonTable } from '../components/Skeleton'
export default function LeaveRequests() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaveRequests()
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-white">Leave Requests</h1>
        </div>
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Leave Requests</h1>
      </div>

      {requests.length === 0 ? (
        <EmptyState icon="🏖" message="No leave requests" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Days</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} className="border-t border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white">{req.employee_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400">{req.leave_type_name || '\u2014'}</td>
                  <td className="px-4 py-3 text-gray-400">{req.start_date}</td>
                  <td className="px-4 py-3 text-gray-400">{req.end_date}</td>
                  <td className="px-4 py-3 text-white">{req.days}</td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
