import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboard } from '../api'
import type { DashboardData } from '../types'
import { useAuth } from '../auth'
import StatusBadge from '../components/StatusBadge'

const WORKLETS = [
  { to: '/my-profile',     icon: '\u{1F464}', label: 'My Profile' },
  { to: '/employees',      icon: '\u{1F465}', label: 'People Directory' },
  { to: '/benefits',       icon: '\u{1F3E5}', label: 'Benefits' },
  { to: '/compensation',   icon: '\u{1F4B0}', label: 'Compensation' },
  { to: '/leave-requests', icon: '\u{1F4CB}', label: 'Time & Leave' },
  { to: '/reports',        icon: '\u{1F4CA}', label: 'Reports' },
  { to: '/job-postings',   icon: '\u{1F4E2}', label: 'Recruitment' },
  { to: '/reviews',        icon: '\u{2B50}',  label: 'Performance' },
]

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    fetchDashboard().then(setData).catch(() => {})
  }, [])

  const displayName = user?.name && user.name !== 'Admin'
    ? user.name.split(' ')[0]
    : user?.email?.split('@')[0] ?? 'there'

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading dashboard...</div>
      </div>
    )
  }

  const pendingCount = (data.pending_leave_requests || 0) + (data.active_review_cycles || 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Welcome Banner ── */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
        <p className="text-sm opacity-80">{formatDate(new Date())}</p>
        <h1 className="text-2xl font-bold mt-1">
          {getGreeting()}, {displayName}
        </h1>
        <p className="text-sm opacity-80 mt-1">
          Here is what is happening across your organisation today.
        </p>
      </div>

      {/* ── Awaiting Your Action ── */}
      {pendingCount > 0 && (
        <Link
          to="/leave-requests"
          className="flex items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 hover:bg-amber-500/20 transition-colors group"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/20 text-2xl shrink-0">
            📥
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-amber-200">Awaiting Your Action</h2>
            <p className="text-xs text-amber-300/70 mt-0.5">
              {data.pending_leave_requests} leave request{data.pending_leave_requests !== 1 ? 's' : ''} pending
              {data.active_review_cycles > 0 && (
                <> &middot; {data.active_review_cycles} review cycle{data.active_review_cycles !== 1 ? 's' : ''} active</>
              )}
            </p>
          </div>
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white text-sm font-bold shrink-0">
            {pendingCount}
          </span>
        </Link>
      )}

      {/* ── Worklet Tiles ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {WORKLETS.map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-2 rounded-xl
                         border border-gray-800 bg-gray-900 p-5
                         hover:border-blue-500/40 hover:bg-gray-800/70
                         transition-all duration-150 group"
            >
              <span className="text-3xl group-hover:scale-110 transition-transform duration-150">
                {icon}
              </span>
              <span className="text-xs font-medium text-gray-300 text-center leading-tight">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
          Organisation Snapshot
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Employees', value: data.total_employees, icon: '\u{1F465}', color: 'text-white' },
            { label: 'Active',          value: data.active_employees, icon: '\u{2705}', color: 'text-emerald-400' },
            { label: 'Pending Leave',   value: data.pending_leave_requests, icon: '\u{1F4CB}', color: 'text-blue-400' },
            { label: 'Open Positions',  value: data.open_positions, icon: '\u{1F4BC}', color: 'text-amber-400' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-800 bg-gray-900 p-4 flex items-start gap-3"
            >
              <span className="text-2xl mt-0.5">{stat.icon}</span>
              <div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Activity: Hires & Leave ── */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Recent Hires */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🎉</span>
            <h2 className="text-sm font-semibold text-white">Recent Hires</h2>
          </div>
          {(data.recent_hires ?? []).length === 0 ? (
            <p className="text-gray-500 text-sm">No recent hires</p>
          ) : (
            <ul className="space-y-3">
              {(data.recent_hires ?? []).map(emp => (
                <li key={emp.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600/20 text-blue-400 text-sm font-bold shrink-0">
                    {emp.first_name?.[0]}{emp.last_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {emp.first_name} {emp.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {emp.department_name || 'No department'} &middot; Started {emp.start_date || '\u2014'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Leave */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🏖️</span>
            <h2 className="text-sm font-semibold text-white">Upcoming Leave</h2>
          </div>
          {(data.upcoming_leave ?? []).length === 0 ? (
            <p className="text-gray-500 text-sm">No upcoming leave</p>
          ) : (
            <ul className="space-y-3">
              {(data.upcoming_leave ?? []).map(req => (
                <li key={req.id} className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-purple-600/20 text-purple-400 text-sm font-bold shrink-0">
                    {req.employee_name?.split(' ').map(n => n?.[0] ?? '').join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">
                      {req.employee_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {req.leave_type_name} &middot; {req.start_date} &ndash; {req.end_date}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Announcements / Timely Info ── */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📌</span>
          <h2 className="text-sm font-semibold text-white">Announcements</h2>
        </div>
        <div className="space-y-3">
          {(data.recent_hires ?? []).length > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <span className="text-gray-500 shrink-0">👋</span>
              <p className="text-gray-400">
                Welcome <span className="text-white font-medium">{data.recent_hires[0].first_name} {data.recent_hires[0].last_name}</span> who
                recently joined{data.recent_hires[0].department_name ? ` the ${data.recent_hires[0].department_name} team` : ''}.
              </p>
            </div>
          )}
          {data.open_positions > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <span className="text-gray-500 shrink-0">📢</span>
              <p className="text-gray-400">
                There {data.open_positions === 1 ? 'is' : 'are'}{' '}
                <Link to="/job-postings" className="text-blue-400 hover:underline font-medium">
                  {data.open_positions} open position{data.open_positions !== 1 ? 's' : ''}
                </Link>{' '}
                awaiting candidates.
              </p>
            </div>
          )}
          {data.pending_leave_requests > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <span className="text-gray-500 shrink-0">⏳</span>
              <p className="text-gray-400">
                <Link to="/leave-requests" className="text-blue-400 hover:underline font-medium">
                  {data.pending_leave_requests} leave request{data.pending_leave_requests !== 1 ? 's' : ''}
                </Link>{' '}
                pending approval.
              </p>
            </div>
          )}
          {(data.recent_hires ?? []).length === 0 && data.open_positions === 0 && data.pending_leave_requests === 0 && (
            <p className="text-gray-500 text-sm">Nothing to report right now. All clear!</p>
          )}
        </div>
      </div>
    </div>
  )
}
