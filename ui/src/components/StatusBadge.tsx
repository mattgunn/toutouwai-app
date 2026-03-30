const statusColors: Record<string, string> = {
  // Employee
  active: 'bg-emerald-600/20 text-emerald-400',
  inactive: 'bg-gray-600/20 text-gray-400',
  on_leave: 'bg-amber-600/20 text-amber-400',
  terminated: 'bg-red-600/20 text-red-400',
  // Leave
  pending: 'bg-amber-600/20 text-amber-400',
  approved: 'bg-emerald-600/20 text-emerald-400',
  rejected: 'bg-red-600/20 text-red-400',
  cancelled: 'bg-gray-600/20 text-gray-400',
  // Recruitment
  open: 'bg-emerald-600/20 text-emerald-400',
  closed: 'bg-gray-600/20 text-gray-400',
  draft: 'bg-gray-700 text-gray-300',
  filled: 'bg-blue-600/20 text-blue-400',
  // Applicant stages
  applied: 'bg-blue-600/20 text-blue-400',
  screening: 'bg-purple-600/20 text-purple-400',
  interview: 'bg-amber-600/20 text-amber-400',
  offer: 'bg-emerald-600/20 text-emerald-400',
  hired: 'bg-emerald-600/20 text-emerald-400',
  // Performance
  not_started: 'bg-gray-700 text-gray-300',
  in_progress: 'bg-blue-600/20 text-blue-400',
  completed: 'bg-emerald-600/20 text-emerald-400',
  // Benefits / Onboarding
  expired: 'bg-red-600/20 text-red-400',
  skipped: 'bg-gray-600/20 text-gray-400',
  // Succession readiness
  ready_now: 'bg-emerald-600/20 text-emerald-400',
  ready_1_year: 'bg-blue-600/20 text-blue-400',
  ready_2_years: 'bg-amber-600/20 text-amber-400',
  not_ready: 'bg-gray-700 text-gray-300',
  // Risk levels
  low: 'bg-emerald-600/20 text-emerald-400',
  medium: 'bg-amber-600/20 text-amber-400',
  high: 'bg-red-600/20 text-red-400',
  critical: 'bg-red-600/20 text-red-400',
  // Employment types
  full_time: 'bg-blue-600/20 text-blue-400',
  part_time: 'bg-cyan-600/20 text-cyan-400',
  contractor: 'bg-orange-600/20 text-orange-400',
  casual: 'bg-teal-600/20 text-teal-400',
  intern: 'bg-violet-600/20 text-violet-400',
  // Learning
  assigned: 'bg-blue-600/20 text-blue-400',
  overdue: 'bg-red-600/20 text-red-400',
  // Announcements
  published: 'bg-emerald-600/20 text-emerald-400',
  // Grievances
  submitted: 'bg-blue-600/20 text-blue-400',
  investigating: 'bg-amber-600/20 text-amber-400',
  dismissed: 'bg-gray-600/20 text-gray-400',
  escalated: 'bg-red-600/20 text-red-400',
  resolved: 'bg-emerald-600/20 text-emerald-400',
  // Probation
  passed: 'bg-emerald-600/20 text-emerald-400',
  extended: 'bg-amber-600/20 text-amber-400',
  failed: 'bg-red-600/20 text-red-400',
  // Notice periods
  serving: 'bg-blue-600/20 text-blue-400',
  waived: 'bg-gray-600/20 text-gray-400',
  // Assets
  available: 'bg-emerald-600/20 text-emerald-400',
  in_use: 'bg-blue-600/20 text-blue-400',
  maintenance: 'bg-amber-600/20 text-amber-400',
  disposed: 'bg-gray-600/20 text-gray-400',
  // Disciplinary
  appealed: 'bg-purple-600/20 text-purple-400',
  // Benefit life events / general
  processing: 'bg-amber-600/20 text-amber-400',
}

export default function StatusBadge({ status }: { status: string }) {
  const classes = statusColors[status] || 'bg-gray-700 text-gray-300'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
