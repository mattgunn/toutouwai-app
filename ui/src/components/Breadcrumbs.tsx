import { Link, useLocation } from 'react-router-dom'

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  employees: 'Directory',
  'org-chart': 'Org Chart',
  departments: 'Departments',
  positions: 'Positions',
  onboarding: 'Onboarding',
  documents: 'Documents',
  timesheets: 'Timesheets',
  'leave-requests': 'Leave Requests',
  'leave-balances': 'Leave Balances',
  compensation: 'Compensation',
  benefits: 'Benefits',
  succession: 'Succession',
  'job-postings': 'Job Postings',
  applicants: 'Applicants',
  pipeline: 'Pipeline',
  reviews: 'Reviews',
  goals: 'Goals',
  surveys: 'Surveys',
  audit: 'Audit Log',
  workflows: 'Workflows',
  'my-profile': 'My Profile',
  reports: 'Reports',
  settings: 'Settings',
}

const SECTION_MAP: Record<string, string> = {
  employees: 'People',
  'org-chart': 'People',
  departments: 'People',
  positions: 'People',
  onboarding: 'People',
  documents: 'People',
  timesheets: 'Time & Leave',
  'leave-requests': 'Time & Leave',
  'leave-balances': 'Time & Leave',
  compensation: 'Compensation',
  benefits: 'Compensation',
  succession: 'Compensation',
  'job-postings': 'Recruitment',
  applicants: 'Recruitment',
  pipeline: 'Recruitment',
  reviews: 'Performance',
  goals: 'Performance',
  surveys: 'Performance',
  audit: 'Admin',
  workflows: 'Admin',
}

interface Crumb {
  label: string
  to?: string
}

export default function Breadcrumbs() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return null
  }

  const crumbs: Crumb[] = [{ label: 'Home', to: '/dashboard' }]

  const firstSegment = segments[0]
  const section = SECTION_MAP[firstSegment]
  if (section) {
    crumbs.push({ label: section })
  }

  const pageLabel = ROUTE_LABELS[firstSegment] || firstSegment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  if (segments.length === 1) {
    crumbs.push({ label: pageLabel })
  } else {
    crumbs.push({ label: pageLabel, to: `/${firstSegment}` })
    const subLabel = segments.slice(1).join(' / ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    crumbs.push({ label: subLabel })
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-600">/</span>}
          {crumb.to && i < crumbs.length - 1 ? (
            <Link to={crumb.to} className="hover:text-gray-300 transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className={i === crumbs.length - 1 ? 'text-gray-400' : ''}>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
