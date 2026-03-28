import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ChartPieIcon,
  UsersIcon,
  ClockIcon,
  BanknotesIcon,
  MegaphoneIcon,
  StarIcon,
  FlagIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowPathRoundedSquareIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PencilSquareIcon,
} from '../components/NavIcons'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TocEntry {
  id: string
  label: string
  icon: ReactNode
}

interface ScreenshotProps {
  src: string
  alt: string
}

interface FeatureSectionProps {
  id: string
  title: string
  screenshot?: string
  features: string[]
  tips?: string[]
  linkTo?: string
  linkLabel?: string
  children?: ReactNode
}

/* ------------------------------------------------------------------ */
/*  TOC data                                                           */
/* ------------------------------------------------------------------ */

const TOC: TocEntry[] = [
  { id: 'quick-start', label: 'Quick Start', icon: <FlagIcon className="w-4 h-4" /> },
  { id: 'dashboard', label: 'Dashboard', icon: <ChartPieIcon className="w-4 h-4" /> },
  { id: 'people', label: 'People Management', icon: <UsersIcon className="w-4 h-4" /> },
  { id: 'time-leave', label: 'Time & Leave', icon: <ClockIcon className="w-4 h-4" /> },
  { id: 'comp-benefits', label: 'Compensation & Benefits', icon: <BanknotesIcon className="w-4 h-4" /> },
  { id: 'recruitment', label: 'Recruitment', icon: <MegaphoneIcon className="w-4 h-4" /> },
  { id: 'performance', label: 'Performance', icon: <StarIcon className="w-4 h-4" /> },
  { id: 'onboarding-docs', label: 'Onboarding & Documents', icon: <DocumentTextIcon className="w-4 h-4" /> },
  { id: 'administration', label: 'Administration', icon: <ShieldCheckIcon className="w-4 h-4" /> },
  { id: 'my-profile', label: 'My Profile', icon: <UserCircleIcon className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Cog6ToothIcon className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integrations', icon: <ArrowPathRoundedSquareIcon className="w-4 h-4" /> },
  { id: 'faq', label: 'FAQ', icon: <PencilSquareIcon className="w-4 h-4" /> },
]

/* ------------------------------------------------------------------ */
/*  Collapsible screenshot                                             */
/* ------------------------------------------------------------------ */

function Screenshot({ src, alt }: ScreenshotProps) {
  const [expanded, setExpanded] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setExpanded(e => !e)}
      className="relative w-full rounded-lg overflow-hidden border border-gray-800 my-4 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <img
        src={src}
        alt={alt}
        className={`w-full transition-all duration-300 ${expanded ? '' : 'max-h-64 object-cover object-top'}`}
      />
      {!expanded && (
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-gray-950 to-transparent flex items-end justify-center pb-2">
          <span className="text-xs text-gray-400">Click to expand</span>
        </div>
      )}
      {expanded && (
        <div className="absolute inset-x-0 bottom-0 bg-gray-950/70 flex items-center justify-center py-1">
          <span className="text-xs text-gray-400">Click to collapse</span>
        </div>
      )}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/*  Feature check icon                                                 */
/* ------------------------------------------------------------------ */

function Check() {
  return (
    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Section card                                                       */
/* ------------------------------------------------------------------ */

function SectionCard({ id, title, screenshot, features, tips, linkTo, linkLabel, children }: FeatureSectionProps) {
  return (
    <div id={id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 scroll-mt-8">
      <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
      {screenshot && <Screenshot src={`/help/${screenshot}`} alt={title} />}
      {children}
      {features.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Features</h4>
          <ul className="space-y-1">
            {features.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                <Check /> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {tips && tips.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Tips</h4>
          <ul className="space-y-1">
            {tips.map(t => (
              <li key={t} className="flex items-start gap-2 text-sm text-gray-400">
                <InfoIcon /> {t}
              </li>
            ))}
          </ul>
        </div>
      )}
      {linkTo && (
        <Link to={linkTo} className="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 mt-2">
          {linkLabel ?? 'Go to Page'} <span aria-hidden="true">&rarr;</span>
        </Link>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  FAQ item                                                           */
/* ------------------------------------------------------------------ */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-800 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-white hover:bg-gray-800/50 rounded-lg transition-colors"
      >
        {q}
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="px-4 pb-3 text-sm text-gray-400">{a}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Help page                                                     */
/* ------------------------------------------------------------------ */

export default function Help() {
  const [activeId, setActiveId] = useState<string>('quick-start')
  const observerRef = useRef<IntersectionObserver | null>(null)

  const setupObserver = useCallback(() => {
    observerRef.current?.disconnect()
    const ids = TOC.map(t => t.id)
    const elems = ids.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    observerRef.current = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          // pick the one closest to top
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    )
    elems.forEach(el => observerRef.current!.observe(el))
  }, [])

  useEffect(() => {
    setupObserver()
    return () => observerRef.current?.disconnect()
  }, [setupObserver])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex gap-8 max-w-7xl mx-auto px-4 pb-16">
      {/* ---- Sidebar TOC ---- */}
      <nav className="hidden md:block sticky top-20 self-start w-56 shrink-0">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contents</h2>
        <ul className="space-y-1">
          {TOC.map(t => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => scrollTo(t.id)}
                className={`flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors ${
                  activeId === t.id ? 'text-blue-400 bg-gray-900' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* ---- Main content ---- */}
      <main className="flex-1 min-w-0 space-y-10 pt-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Help &amp; Documentation</h1>
          <p className="text-gray-500 text-sm">Everything you need to know about using the HRIS platform.</p>
        </div>

        {/* ---- Quick Start ---- */}
        <div id="quick-start" className="bg-gradient-to-br from-blue-950/60 to-gray-900 border border-blue-900/40 rounded-xl p-6 scroll-mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Start</h2>
          <ol className="space-y-3">
            {[
              <>Seed sample data in <Link to="/settings" className="text-blue-400 hover:underline">Settings &rarr; Developer</Link></>,
              <>Browse the <Link to="/employees" className="text-blue-400 hover:underline">Employee Directory</Link> to see your workforce</>,
              <>Check the <Link to="/dashboard" className="text-blue-400 hover:underline">Dashboard</Link> for an overview</>,
              <>Set up <Link to="/settings" className="text-blue-400 hover:underline">Integrations</Link> in Settings</>,
              <>Customise your <Link to="/settings" className="text-blue-400 hover:underline">Theme</Link> in Settings &rarr; Appearance</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* ---- Getting Started / Dashboard ---- */}
        <section id="dashboard" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><ChartPieIcon className="w-5 h-5 text-blue-400" /> Getting Started / Dashboard</h2>
          <SectionCard
            id="dashboard-card"
            title="Dashboard"
            screenshot="dashboard.png"
            features={[
              'Welcome banner with personalised greeting',
              'Quick access tiles to key modules',
              'Organisation snapshot with headcount, departments, and open positions',
              'Recent activity feed',
              'Announcements board',
            ]}
            tips={[
              'Use the global search bar to quickly navigate to any page',
              'Customise your theme in Settings \u2192 Appearance',
            ]}
            linkTo="/dashboard"
            linkLabel="Go to Dashboard"
          />
        </section>

        {/* ---- People Management ---- */}
        <section id="people" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><UsersIcon className="w-5 h-5 text-blue-400" /> People Management</h2>

          <SectionCard
            id="employees-card"
            title="Employee Directory"
            screenshot="employees.png"
            features={[
              'Create, edit, and search employees',
              'Avatar display with initials fallback',
              'Department and position filters',
              'Status badges (Active, Inactive, On Leave)',
              'Paginated list with configurable page size',
            ]}
            tips={['Click any row to open the employee detail and edit their record']}
            linkTo="/employees"
            linkLabel="Go to Employees"
          />

          <SectionCard
            id="org-chart-card"
            title="Org Chart"
            screenshot="org-chart.png"
            features={[
              'Visual organisational hierarchy',
              'Expand and collapse nodes',
              'Avatar display on each node',
              'Auto-generated from manager relationships',
            ]}
            tips={['Click on any node to expand or collapse its direct reports']}
            linkTo="/org-chart"
            linkLabel="Go to Org Chart"
          />

          <SectionCard
            id="departments-card"
            title="Departments"
            screenshot="departments.png"
            features={[
              'Create, edit, and delete departments',
              'View employee count per department',
              'Assign department managers',
            ]}
            tips={['Employee counts auto-update when staff are moved between departments']}
            linkTo="/departments"
            linkLabel="Go to Departments"
          />

          <SectionCard
            id="positions-card"
            title="Positions"
            screenshot="positions.png"
            features={[
              'Full CRUD for job positions',
              'Link positions to departments',
              'Track position titles and descriptions',
            ]}
            tips={['Positions are referenced in employee records and recruitment']}
            linkTo="/positions"
            linkLabel="Go to Positions"
          />
        </section>

        {/* ---- Time & Leave ---- */}
        <section id="time-leave" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><ClockIcon className="w-5 h-5 text-blue-400" /> Time &amp; Leave</h2>

          <SectionCard
            id="timesheets-card"
            title="Timesheets"
            screenshot="timesheets.png"
            features={[
              'Create and manage time entries',
              'Date range filters',
              'Project and task tracking',
              'Hours validation (0\u201324 per entry)',
            ]}
            tips={['Hours are validated between 0 and 24 per entry']}
            linkTo="/timesheets"
            linkLabel="Go to Timesheets"
          />

          <SectionCard
            id="leave-requests-card"
            title="Leave Requests"
            screenshot="leave-requests.png"
            features={[
              'Submit and manage leave requests',
              'Status filter pills (All / Pending / Approved / Rejected)',
              'Approve or reject with reasons',
              'Leave type categorisation',
            ]}
            tips={['Leave balances are automatically recalculated when requests are approved']}
            linkTo="/leave-requests"
            linkLabel="Go to Leave Requests"
          />

          <SectionCard
            id="leave-balances-card"
            title="Leave Balances"
            screenshot="leave-balances.png"
            features={[
              'Per-employee, per-type leave balance breakdown',
              'View remaining entitlements at a glance',
              'Automatic calculation from approved requests',
            ]}
            linkTo="/leave-balances"
            linkLabel="Go to Leave Balances"
          />
        </section>

        {/* ---- Compensation & Benefits ---- */}
        <section id="comp-benefits" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><BanknotesIcon className="w-5 h-5 text-blue-400" /> Compensation &amp; Benefits</h2>

          <SectionCard
            id="compensation-card"
            title="Compensation"
            screenshot="compensation.png"
            features={[
              'Salary history tracking per employee',
              'Multi-currency support',
              'Pay frequency options (Annual, Monthly, Hourly)',
              'Effective date tracking for changes',
            ]}
            tips={['The most recent compensation record is displayed as the current salary']}
            linkTo="/compensation"
            linkLabel="Go to Compensation"
          />

          <SectionCard
            id="benefits-card"
            title="Benefits"
            screenshot="benefits.png"
            features={[
              'Benefit plan management with plan cards',
              'Employee enrollment tracking',
              'Employer and employee contribution tracking',
              'Plan type categorisation',
            ]}
            linkTo="/benefits"
            linkLabel="Go to Benefits"
          />

          <SectionCard
            id="succession-card"
            title="Succession Planning"
            screenshot="succession.png"
            features={[
              'Identify critical positions and key roles',
              'Risk and impact assessment ratings',
              'Candidate pipeline per position',
              'Readiness tracking (Ready Now, 1\u20132 Years, 3+ Years)',
            ]}
            linkTo="/succession"
            linkLabel="Go to Succession"
          />
        </section>

        {/* ---- Recruitment ---- */}
        <section id="recruitment" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><MegaphoneIcon className="w-5 h-5 text-blue-400" /> Recruitment</h2>

          <SectionCard
            id="job-postings-card"
            title="Job Postings"
            screenshot="job-postings.png"
            features={[
              'Create and manage open positions',
              'Status badges (Open, Draft, Closed)',
              'Location and salary range fields',
              'Department and position linking',
            ]}
            linkTo="/job-postings"
            linkLabel="Go to Job Postings"
          />

          <SectionCard
            id="applicants-card"
            title="Applicants"
            screenshot="applicants.png"
            features={[
              'Candidate tracking and management',
              'Stage progression (Applied \u2192 Screen \u2192 Interview \u2192 Offer)',
              'Star rating system for candidates',
              'Link applicants to job postings',
            ]}
            linkTo="/applicants"
            linkLabel="Go to Applicants"
          />

          <SectionCard
            id="pipeline-card"
            title="Recruitment Pipeline"
            screenshot="pipeline.png"
            features={[
              'Visual Kanban-style recruitment funnel',
              'Candidate cards with key details',
              'Stage counts and progression tracking',
              'Drag-and-drop style stage management',
            ]}
            linkTo="/pipeline"
            linkLabel="Go to Pipeline"
          />
        </section>

        {/* ---- Performance ---- */}
        <section id="performance" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><StarIcon className="w-5 h-5 text-blue-400" /> Performance</h2>

          <SectionCard
            id="reviews-card"
            title="Performance Reviews"
            screenshot="reviews.png"
            features={[
              'Create and manage review cycles',
              'Rating system with configurable scales',
              'Reviewer assignment per employee',
              'Cycle status tracking (Draft, Active, Completed)',
            ]}
            linkTo="/reviews"
            linkLabel="Go to Reviews"
          />

          <SectionCard
            id="goals-card"
            title="Goals"
            screenshot="goals.png"
            features={[
              'Set and track employee goals',
              'Progress bars with percentage completion',
              'Due date tracking',
              'Status indicators (Not Started, In Progress, Completed)',
            ]}
            linkTo="/goals"
            linkLabel="Go to Goals"
          />

          <SectionCard
            id="surveys-card"
            title="Employee Surveys"
            screenshot="surveys.png"
            features={[
              'Question builder with multiple question types',
              'Anonymous response collection',
              'Aggregated results and analytics',
              'Survey status management',
            ]}
            linkTo="/surveys"
            linkLabel="Go to Surveys"
          />
        </section>

        {/* ---- Onboarding & Documents ---- */}
        <section id="onboarding-docs" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><DocumentTextIcon className="w-5 h-5 text-blue-400" /> Onboarding &amp; Documents</h2>

          <SectionCard
            id="onboarding-card"
            title="Onboarding"
            screenshot="onboarding.png"
            features={[
              'New hire onboarding checklists',
              'Reusable templates for different roles',
              'Task assignment to team members',
              'Progress tracking per new hire',
            ]}
            linkTo="/onboarding"
            linkLabel="Go to Onboarding"
          />

          <SectionCard
            id="documents-card"
            title="Documents"
            screenshot="documents.png"
            features={[
              'Centralised document management',
              'Category filtering (Contracts, Policies, Certifications)',
              'Expiry date warnings for time-sensitive documents',
              'Upload tracking with timestamps',
            ]}
            linkTo="/documents"
            linkLabel="Go to Documents"
          />
        </section>

        {/* ---- Administration ---- */}
        <section id="administration" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><ShieldCheckIcon className="w-5 h-5 text-blue-400" /> Administration</h2>

          <SectionCard
            id="reports-card"
            title="Reports"
            screenshot="reports.png"
            features={[
              'Headcount report with department breakdown',
              'Turnover analysis',
              'Leave utilisation summary',
              'Time summary by employee and project',
              'Compensation overview',
              'Recruitment pipeline analytics',
            ]}
            linkTo="/reports"
            linkLabel="Go to Reports"
          />

          <SectionCard
            id="audit-log-card"
            title="Audit Log"
            screenshot="audit-log.png"
            features={[
              'Full activity tracking across the platform',
              'Entity type filtering (Employee, Department, Leave, etc.)',
              'Date range filters',
              'Field-level change tracking showing old and new values',
            ]}
            linkTo="/audit"
            linkLabel="Go to Audit Log"
          />

          <SectionCard
            id="workflows-card"
            title="Workflows"
            screenshot="workflows.png"
            features={[
              'Configurable approval engine',
              'Multi-step approval chains',
              'Approve or reject with comments',
              'Workflow status tracking',
            ]}
            linkTo="/workflows"
            linkLabel="Go to Workflows"
          />
        </section>

        {/* ---- My Profile ---- */}
        <section id="my-profile" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><UserCircleIcon className="w-5 h-5 text-blue-400" /> My Profile</h2>

          <SectionCard
            id="my-profile-card"
            title="My Profile"
            screenshot="my-profile.png"
            features={[
              'View and edit your personal details',
              'Leave history and balances',
              'Time entry log',
              'Personal documents',
              'Onboarding checklist progress',
            ]}
            tips={['Employees can self-service many updates without needing an admin']}
            linkTo="/my-profile"
            linkLabel="Go to My Profile"
          />
        </section>

        {/* ---- Settings ---- */}
        <section id="settings" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Cog6ToothIcon className="w-5 h-5 text-blue-400" /> Settings</h2>

          <SectionCard
            id="settings-card"
            title="Settings"
            screenshot="settings.png"
            features={[
              'Four themes: Dark, Light, Katana, Workday',
              'Layout options: sidebar or topbar navigation',
              'Ten integrations with external services',
              'Developer tools: seed and clear database',
            ]}
            tips={[
              'Use the Developer tab to seed sample data when getting started',
              'Theme changes apply instantly across the entire app',
            ]}
            linkTo="/settings"
            linkLabel="Go to Settings"
          />
        </section>

        {/* ---- Integrations ---- */}
        <section id="integrations" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><ArrowPathRoundedSquareIcon className="w-5 h-5 text-blue-400" /> Integrations</h2>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-sm text-gray-400 mb-4">
              Connect your HRIS with the tools your organisation already uses. Configure integrations in{' '}
              <Link to="/settings" className="text-blue-400 hover:underline">Settings &rarr; Integrations</Link>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ['PayHero', 'Payroll processing and pay-run management for NZ businesses'],
                ['Azure AD', 'Single sign-on and directory sync with Microsoft Azure Active Directory'],
                ['Xero', 'Accounting integration for payroll journals and expense tracking'],
                ['Deputy', 'Shift scheduling, timesheets, and workforce management sync'],
                ['Slack', 'Notifications and alerts delivered to Slack channels'],
                ['Microsoft Teams', 'Notifications and approvals via Microsoft Teams'],
                ['Google Workspace', 'Directory sync and calendar integration with Google'],
                ['Okta', 'Enterprise SSO and user provisioning via Okta'],
                ['SmartRecruiters', 'ATS integration for job posting and applicant sync'],
                ['Employment Hero', 'HR, payroll, and benefits platform integration'],
              ] as const).map(([name, desc]) => (
                <div key={name} className="flex items-start gap-3 rounded-lg border border-gray-800 p-3">
                  <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-blue-400 shrink-0">
                    <ArrowPathRoundedSquareIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{name}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- FAQ ---- */}
        <section id="faq" className="scroll-mt-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><PencilSquareIcon className="w-5 h-5 text-blue-400" /> Frequently Asked Questions</h2>
          <div className="space-y-2">
            <FaqItem q="How do I add a new employee?" a="Navigate to the Employee Directory and click the 'Add Employee' button. Fill in the required fields and save." />
            <FaqItem q="How do leave balances work?" a="Leave balances are automatically calculated from approved leave requests against each employee's annual entitlement. Balances update in real time as requests are approved." />
            <FaqItem q="Can I customise the theme?" a="Yes. Go to Settings \u2192 Appearance and choose from four themes: Dark, Light, Katana, or Workday. Changes apply instantly." />
            <FaqItem q="How do I approve leave requests?" a="Open the Leave Requests page. Pending requests display an Approve and Reject button. Click either to update the status, optionally providing a reason." />
            <FaqItem q="What integrations are available?" a="Ten integrations are available: PayHero, Azure AD, Xero, Deputy, Slack, Microsoft Teams, Google Workspace, Okta, SmartRecruiters, and Employment Hero. Configure them in Settings \u2192 Integrations." />
            <FaqItem q="How do I seed test data?" a="Go to Settings \u2192 Developer and click 'Seed Database'. This populates the system with sample employees, departments, leave records, and more." />
            <FaqItem q="How does the org chart work?" a="The org chart is auto-generated from manager relationships defined on employee records. Click any node to expand or collapse its direct reports." />
            <FaqItem q="Can employees access their own data?" a="Yes. The My Profile page provides self-service access where employees can view and edit their personal details, leave history, time entries, and documents." />
            <FaqItem q="How do workflows work?" a="Define approval chains in the Workflows page. When actions require approval, they route through the configured chain. Approvers can approve or reject from the My Approvals tab." />
            <FaqItem q="How do I run reports?" a="The Reports page offers six report types: Headcount, Turnover, Leave Utilisation, Time Summary, Compensation, and Recruitment. Data auto-populates from your records." />
          </div>
        </section>
      </main>
    </div>
  )
}
