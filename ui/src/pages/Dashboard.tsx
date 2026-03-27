import { useState, useEffect } from 'react'
import { fetchDashboard } from '../api'
import type { DashboardData } from '../types'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetchDashboard().then(setData).catch(() => {})
  }, [])

  if (!data) {
    return <div className="text-gray-500">Loading dashboard...</div>
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Employees" value={data.total_employees} />
        <StatCard label="Active" value={data.active_employees} color="green" />
        <StatCard label="Pending Leave" value={data.pending_leave_requests} color="blue" />
        <StatCard label="Open Positions" value={data.open_positions} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Hires */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Recent Hires</h2>
          {data.recent_hires.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent hires</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Department</th>
                  <th className="pb-2">Start Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_hires.map(emp => (
                  <tr key={emp.id} className="border-t border-gray-800">
                    <td className="py-2 text-white">{emp.first_name} {emp.last_name}</td>
                    <td className="py-2 text-gray-400">{emp.department_name || '\u2014'}</td>
                    <td className="py-2 text-gray-400">{emp.start_date || '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Upcoming Leave */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-3">Upcoming Leave</h2>
          {data.upcoming_leave.length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming leave</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Dates</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.upcoming_leave.map(req => (
                  <tr key={req.id} className="border-t border-gray-800">
                    <td className="py-2 text-white">{req.employee_name}</td>
                    <td className="py-2 text-gray-400">{req.leave_type_name}</td>
                    <td className="py-2 text-gray-400">{req.start_date} &ndash; {req.end_date}</td>
                    <td className="py-2"><StatusBadge status={req.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
