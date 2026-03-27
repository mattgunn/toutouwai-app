import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth'
import { useAdminPrefs } from '../hooks/useAdminPrefs'
import { fetchSettings } from '../api'
import { MODULES } from '../modules/modules/registry'

type NavItem = { to: string; label: string; icon: string; module: string }
type NavGroup = { heading?: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'People',
    items: [
      { to: '/employees',   label: 'Directory',   icon: '\u{1F465}', module: 'employees' },
      { to: '/org-chart',   label: 'Org Chart',   icon: '\u{1F3E2}', module: 'employees' },
      { to: '/departments', label: 'Departments', icon: '\u{1F3EC}', module: 'departments' },
      { to: '/positions',   label: 'Positions',   icon: '\u{1F4BC}', module: 'positions' },
      { to: '/onboarding',  label: 'Onboarding',  icon: '\u{1F91D}', module: 'employees' },
      { to: '/documents',   label: 'Documents',   icon: '\u{1F4C1}', module: 'employees' },
    ],
  },
  {
    heading: 'Time & Leave',
    items: [
      { to: '/timesheets',     label: 'Timesheets',     icon: '\u{23F1}\u{FE0F}', module: 'timesheets' },
      { to: '/leave-requests', label: 'Leave Requests', icon: '\u{1F4CB}',         module: 'leave' },
      { to: '/leave-balances', label: 'Leave Balances', icon: '\u{1F4CA}',         module: 'leave' },
    ],
  },
  {
    heading: 'Compensation',
    items: [
      { to: '/compensation', label: 'Compensation', icon: '\u{1F4B0}', module: 'compensation' },
      { to: '/benefits',     label: 'Benefits',     icon: '\u{1F3E5}', module: 'benefits' },
      { to: '/succession',   label: 'Succession',   icon: '\u{1F451}', module: 'succession' },
    ],
  },
  {
    heading: 'Recruitment',
    items: [
      { to: '/job-postings', label: 'Job Postings', icon: '\u{1F4E2}', module: 'recruitment' },
      { to: '/applicants',   label: 'Applicants',   icon: '\u{1F4C4}', module: 'recruitment' },
      { to: '/pipeline',     label: 'Pipeline',     icon: '\u{1F4C8}', module: 'recruitment' },
    ],
  },
  {
    heading: 'Performance',
    items: [
      { to: '/reviews', label: 'Reviews', icon: '\u{2B50}', module: 'performance' },
      { to: '/goals',   label: 'Goals',   icon: '\u{1F3AF}', module: 'performance' },
      { to: '/surveys', label: 'Surveys', icon: '\u{1F4DD}', module: 'performance' },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { to: '/audit',     label: 'Audit Log',  icon: '\u{1F4DC}', module: 'settings' },
      { to: '/workflows', label: 'Workflows',  icon: '\u{1F504}', module: 'settings' },
    ],
  },
]

const GLOBAL_ITEMS: NavItem[] = [
  { to: '/my-profile', label: 'My Profile', icon: '\u{1F464}', module: '' },
  { to: '/reports',  label: 'Reports',  icon: '\u{1F4CA}', module: 'reports' },
  { to: '/settings', label: 'Settings', icon: '\u{2699}\u{FE0F}', module: 'settings' },
]

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  )
}

function VerticalNav({ onNavigate, hasPermission, navGroups }: { onNavigate: () => void; hasPermission: (m: string) => boolean; navGroups: NavGroup[] }) {
  const filteredGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => hasPermission(item.module)),
    }))
    .filter(group => group.items.length > 0)

  const filteredGlobal = GLOBAL_ITEMS.filter(item => hasPermission(item.module))

  return (
    <>
      <div className="flex-1 py-2 overflow-y-auto">
        {filteredGroups.map((group, gi) => (
          <div key={gi} className={group.heading ? 'mt-3' : ''}>
            {group.heading && (
              <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                {group.heading}
              </p>
            )}
            {group.items.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`
                }
              >
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {filteredGlobal.length > 0 && (
        <div className="py-2 border-t border-gray-800">
          <p className="px-4 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Global
          </p>
          {filteredGlobal.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`
              }
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </>
  )
}

function getActiveGroup(pathname: string, hasPermission: (m: string) => boolean, navGroups: NavGroup[]) {
  for (const group of navGroups) {
    const visible = group.items.filter(item => hasPermission(item.module))
    if (visible.some(item => pathname.startsWith(item.to))) {
      return { ...group, items: visible }
    }
  }
  return null
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const prefs = useAdminPrefs()
  const [moduleSettings, setModuleSettings] = useState<Record<string, unknown>>({})

  useEffect(() => {
    fetchSettings().then(setModuleSettings).catch(() => {})
  }, [])

  const enabledNavGroups = NAV_GROUPS.filter(group => {
    if (!group.heading) return true
    const mod = MODULES.find(m => m.navGroups.includes(group.heading!))
    if (!mod) return true
    return moduleSettings[mod.enabledKey] !== false
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeSidebar = () => setSidebarOpen(false)

  const allItems = [...ALL_NAV_ITEMS, ...GLOBAL_ITEMS]
  const currentPage = allItems.find(item => location.pathname.startsWith(item.to))

  const isDev = prefs.mode === 'dev'
  const effectiveNavColor = isDev ? '#dc2626' : prefs.navColor
  const navBg = effectiveNavColor ? { backgroundColor: effectiveNavColor } : undefined
  const katanaNav = prefs.theme === 'katana' && !effectiveNavColor

  const displayName = user?.name && user.name !== 'Admin' ? user.name : user?.email

  /* ================================================================
   * TOPBAR LAYOUT
   * ============================================================= */
  if (prefs.navLayout === 'topbar') {
    const topbarClass = katanaNav ? 'katana-topbar' : ''
    const activeGroup = getActiveGroup(location.pathname, hasPermission, enabledNavGroups)
    const showSubNav = activeGroup && activeGroup.heading

    const filteredGroups = enabledNavGroups
      .map(group => ({
        ...group,
        items: group.items.filter(item => hasPermission(item.module)),
      }))
      .filter(group => group.items.length > 0)

    const filteredGlobal = GLOBAL_ITEMS.filter(item => hasPermission(item.module))

    return (
      <div className="flex flex-col h-screen bg-gray-950">
        {/* Desktop top navigation bar */}
        <nav
          className={`hidden md:flex items-center h-12 px-4 border-b border-gray-800 shrink-0 ${!effectiveNavColor ? 'bg-gray-900' : ''} ${topbarClass}`}
          style={navBg}
        >
          <NavLink to="/dashboard" className="font-bold text-white text-sm tracking-tight mr-6 shrink-0 hover:opacity-80 transition-opacity">
            {isDev ? `DEV \u2014 ${prefs.instanceLabel || 'HRIS'}` : (prefs.instanceLabel || 'HRIS')}
          </NavLink>

          <div className="flex items-center gap-1 flex-1 min-w-0">
            {filteredGroups.map((group, gi) => {
              if (!group.heading) {
                return group.items.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors whitespace-nowrap rounded ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                      }`
                    }
                  >
                    <span className="text-xs">{icon}</span>
                    <span>{label}</span>
                  </NavLink>
                ))
              }

              const isGroupActive = group.items.some(item =>
                location.pathname.startsWith(item.to)
              )
              return (
                <NavLink
                  key={gi}
                  to={group.items[0].to}
                  className={
                    `flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors whitespace-nowrap rounded ${
                      isGroupActive
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`
                  }
                >
                  <span>{group.heading}</span>
                </NavLink>
              )
            })}
          </div>

          <div className="flex items-center gap-1 ml-4 shrink-0">
            {filteredGlobal.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors whitespace-nowrap rounded ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`
                }
              >
                <span className="text-xs">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
            {user && (
              <span className="text-xs text-gray-500 truncate max-w-32 ml-2" title={user.email}>
                {displayName}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors ml-1"
            >
              Sign out
            </button>
          </div>
        </nav>

        {/* Sub-navigation (desktop) */}
        {showSubNav && (
          <div className="hidden md:flex items-center gap-0.5 px-4 h-10 border-b border-gray-800 bg-gray-900 shrink-0 katana-subnav">
            {activeGroup.items.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'text-white border-b-2 border-blue-400 -mb-px'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded'
                  }`
                }
              >
                <span>{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        )}

        {/* Mobile top bar */}
        <div
          className={`md:hidden flex items-center justify-between px-3 h-12 border-b border-gray-800 shrink-0 ${!effectiveNavColor ? 'bg-gray-900' : ''} ${topbarClass}`}
          style={navBg}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 -ml-1 text-gray-400 hover:text-white"
              aria-label="Toggle menu"
            >
              <MenuIcon open={sidebarOpen} />
            </button>
            <span className="text-sm font-semibold text-white">
              {currentPage?.label ?? (prefs.instanceLabel || 'HRIS')}
            </span>
          </div>
        </div>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={closeSidebar} />
        )}
        <nav
          className={`fixed inset-y-0 left-0 z-40 w-56 border-r border-gray-800 flex flex-col
            transform transition-transform duration-200 ease-in-out md:hidden
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            ${!effectiveNavColor ? 'bg-gray-900' : ''} ${topbarClass}`}
          style={navBg}
        >
          <div className="px-4 py-4 border-b border-gray-800" style={navBg}>
            <h1 className="text-lg font-bold tracking-tight" style={{ color: '#ffffff' }}>
              {isDev ? `DEV \u2014 ${prefs.instanceLabel || 'HRIS'}` : (prefs.instanceLabel || 'HRIS')}
            </h1>
          </div>

          <VerticalNav onNavigate={closeSidebar} hasPermission={hasPermission} navGroups={enabledNavGroups} />

          <div className="px-4 py-3 border-t border-gray-800">
            {user && (
              <div className="text-xs text-gray-500 truncate mb-2" title={user.email}>
                {displayName}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Sign out
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    )
  }

  /* ================================================================
   * SIDEBAR LAYOUT (default)
   * ============================================================= */
  const katanaSidebar = katanaNav ? 'katana-sidebar' : ''

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Mobile top bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-30 md:hidden flex items-center justify-between px-3 h-12 border-b border-gray-800 ${!effectiveNavColor ? 'bg-gray-900' : ''} ${katanaSidebar}`}
        style={navBg}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 -ml-1 text-gray-400 hover:text-white"
            aria-label="Toggle menu"
          >
            <MenuIcon open={sidebarOpen} />
          </button>
          <span className="text-sm font-semibold text-white">
            {currentPage?.label ?? (prefs.instanceLabel || 'HRIS')}
          </span>
        </div>
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed inset-y-0 left-0 z-40 w-56 border-r border-gray-800 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
          ${!effectiveNavColor ? 'bg-gray-900' : ''} ${katanaSidebar}`}
        style={navBg}
      >
        <NavLink to="/dashboard" className="block px-4 py-4 border-b border-gray-800 hover:opacity-80 transition-opacity" style={navBg}>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: '#ffffff' }}>
            {isDev ? `DEV \u2014 ${prefs.instanceLabel || 'HRIS'}` : (prefs.instanceLabel || 'HRIS')}
          </h1>
        </NavLink>

        <VerticalNav onNavigate={closeSidebar} hasPermission={hasPermission} navGroups={enabledNavGroups} />

        <div className="px-4 py-3 border-t border-gray-800">
          {user && (
            <div className="text-xs text-gray-500 truncate mb-2" title={user.email}>
              {displayName}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 pt-16 md:pt-6">
        {children}
      </main>
    </div>
  )
}
