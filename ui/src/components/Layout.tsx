import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth'
import { useAdminPrefs } from '../hooks/useAdminPrefs'
import { fetchSettings } from '../api'
import { MODULES } from '../modules/modules/registry'
import Breadcrumbs from './Breadcrumbs'
import Avatar from './Avatar'
import {
  UsersIcon, BuildingOfficeIcon, BuildingOffice2Icon,
  BriefcaseIcon, HandRaisedIcon, FolderOpenIcon,
  ClockIcon, CalendarDaysIcon, ChartBarSquareIcon,
  BanknotesIcon, HeartIcon, ArrowTrendingUpIcon,
  MegaphoneIcon, DocumentTextIcon, FunnelIcon,
  StarIcon, FlagIcon, PencilSquareIcon,
  ShieldCheckIcon, ArrowPathRoundedSquareIcon,
  UserCircleIcon, ChartPieIcon, Cog6ToothIcon, QuestionMarkCircleIcon,
  AcademicCapIcon, CalendarIcon,
  WrenchScrewdriverIcon, SpeakerWaveIcon,
  BellIcon,
} from './NavIcons'

type NavItem = { to: string; label: string; icon: ReactNode; module: string }
type NavGroup = { heading?: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'People',
    items: [
      { to: '/employees',   label: 'Directory',   icon: <UsersIcon className="w-4 h-4" />, module: 'employees' },
      { to: '/org-chart',   label: 'Org Chart',   icon: <BuildingOfficeIcon className="w-4 h-4" />, module: 'employees' },
      { to: '/departments', label: 'Departments', icon: <BuildingOffice2Icon className="w-4 h-4" />, module: 'departments' },
      { to: '/positions',   label: 'Positions',   icon: <BriefcaseIcon className="w-4 h-4" />, module: 'positions' },
      { to: '/onboarding',  label: 'Onboarding',  icon: <HandRaisedIcon className="w-4 h-4" />, module: 'employees' },
      { to: '/documents',   label: 'Documents',   icon: <FolderOpenIcon className="w-4 h-4" />, module: 'employees' },
    ],
  },
  {
    heading: 'Time & Leave',
    items: [
      { to: '/timesheets',       label: 'Timesheets',       icon: <ClockIcon className="w-4 h-4" />, module: 'timesheets' },
      { to: '/leave-requests',   label: 'Leave Requests',   icon: <CalendarDaysIcon className="w-4 h-4" />, module: 'leave' },
      { to: '/leave-balances',   label: 'Leave Balances',   icon: <ChartBarSquareIcon className="w-4 h-4" />, module: 'leave' },
      { to: '/absence-calendar', label: 'Absence Calendar', icon: <CalendarIcon className="w-4 h-4" />, module: 'leave' },
    ],
  },
  {
    heading: 'Compensation',
    items: [
      { to: '/compensation', label: 'Compensation', icon: <BanknotesIcon className="w-4 h-4" />, module: 'compensation' },
      { to: '/benefits',     label: 'Benefits',     icon: <HeartIcon className="w-4 h-4" />, module: 'benefits' },
      { to: '/succession',   label: 'Succession',   icon: <ArrowTrendingUpIcon className="w-4 h-4" />, module: 'succession' },
    ],
  },
  {
    heading: 'Recruitment',
    items: [
      { to: '/job-postings', label: 'Job Postings', icon: <MegaphoneIcon className="w-4 h-4" />, module: 'recruitment' },
      { to: '/applicants',   label: 'Applicants',   icon: <DocumentTextIcon className="w-4 h-4" />, module: 'recruitment' },
      { to: '/pipeline',     label: 'Pipeline',     icon: <FunnelIcon className="w-4 h-4" />, module: 'recruitment' },
    ],
  },
  {
    heading: 'Performance',
    items: [
      { to: '/reviews',  label: 'Reviews',  icon: <StarIcon className="w-4 h-4" />, module: 'performance' },
      { to: '/goals',    label: 'Goals',    icon: <FlagIcon className="w-4 h-4" />, module: 'performance' },
      { to: '/surveys',  label: 'Surveys',  icon: <PencilSquareIcon className="w-4 h-4" />, module: 'performance' },
      { to: '/learning', label: 'Learning', icon: <AcademicCapIcon className="w-4 h-4" />, module: 'performance' },
    ],
  },
  {
    heading: 'Workplace',
    items: [
      { to: '/announcements', label: 'Announcements', icon: <SpeakerWaveIcon className="w-4 h-4" />, module: 'announcements' },
      { to: '/assets',        label: 'Assets',        icon: <WrenchScrewdriverIcon className="w-4 h-4" />, module: 'assets' },
    ],
  },
  {
    heading: 'Admin',
    items: [
      { to: '/audit',     label: 'Audit Log',  icon: <ShieldCheckIcon className="w-4 h-4" />, module: 'settings' },
      { to: '/workflows', label: 'Workflows',  icon: <ArrowPathRoundedSquareIcon className="w-4 h-4" />, module: 'settings' },
    ],
  },
]

const GLOBAL_ITEMS: NavItem[] = [
  { to: '/my-profile',     label: 'My Profile',     icon: <UserCircleIcon className="w-4 h-4" />, module: '' },
  { to: '/notifications',  label: 'Notifications',  icon: <BellIcon className="w-4 h-4" />, module: '' },
  { to: '/reports',        label: 'Reports',         icon: <ChartPieIcon className="w-4 h-4" />, module: 'reports' },
  { to: '/help',           label: 'Help',            icon: <QuestionMarkCircleIcon className="w-4 h-4" />, module: '' },
  { to: '/settings',       label: 'Settings',        icon: <Cog6ToothIcon className="w-4 h-4" />, module: 'settings' },
]

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items)

const COLLAPSED_STORAGE_KEY = 'hris_nav_collapsed'

function loadCollapsedGroups(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_STORAGE_KEY)
    if (raw) {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr)
    }
  } catch { /* ignore */ }
  return new Set()
}

function saveCollapsedGroups(groups: Set<string>) {
  try {
    localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...groups]))
  } catch { /* ignore */ }
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-3 h-3 text-gray-600 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function NotificationBell({ count = 3 }: { count?: number }) {
  return (
    <button className="relative p-1.5 text-gray-400 hover:text-gray-200 transition-colors" aria-label="Notifications">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}

function GlobalSearch({ navItems, sidebar }: { navItems: NavItem[]; sidebar?: boolean }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const results = query.trim()
    ? navItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className={`relative ${sidebar ? 'mx-3 my-2' : ''}`}>
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search pages..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className={
            sidebar
              ? 'w-full bg-gray-800 border border-gray-700 rounded-md pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors'
              : 'w-48 lg:w-64 bg-gray-800 border border-gray-700 rounded-md pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors'
          }
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-full bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map(item => (
            <button
              key={item.to}
              onClick={() => {
                navigate(item.to)
                setQuery('')
                setOpen(false)
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors text-left"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

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

function VerticalNav({
  onNavigate,
  hasPermission,
  navGroups,
  collapsedGroups,
  onToggleGroup,
}: {
  onNavigate: () => void
  hasPermission: (m: string) => boolean
  navGroups: NavGroup[]
  collapsedGroups: Set<string>
  onToggleGroup: (heading: string) => void
}) {
  const location = useLocation()

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
        {filteredGroups.map((group, gi) => {
          const heading = group.heading
          const isCollapsed = heading ? collapsedGroups.has(heading) : false
          // Auto-expand group containing active route
          const isActiveGroup = heading
            ? group.items.some(item => location.pathname.startsWith(item.to))
            : false
          const showItems = !heading || isActiveGroup || !isCollapsed

          return (
            <div key={gi}>
              {heading && (
                <>
                  {gi > 0 && <div className="border-t border-gray-800/50 mt-1 pt-1" />}
                  <button
                    onClick={() => onToggleGroup(heading)}
                    className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <span>{heading}</span>
                    <ChevronIcon expanded={showItems} />
                  </button>
                </>
              )}
              {showItems && group.items.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border-l-3 border-blue-400 font-medium'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`
                  }
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          )
        })}
      </div>

      {filteredGlobal.length > 0 && (
        <div className="py-2 border-t border-gray-800">
          <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
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
                    ? 'bg-blue-600/20 text-blue-400 border-l-3 border-blue-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`
              }
            >
              {icon}
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
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(loadCollapsedGroups)

  const toggleGroup = useCallback((heading: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(heading)) {
        next.delete(heading)
      } else {
        next.add(heading)
      }
      saveCollapsedGroups(next)
      return next
    })
  }, [])

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
  const workdayNav = prefs.theme === 'workday' && !effectiveNavColor

  const displayName = user?.name && user.name !== 'Admin' ? user.name : user?.email

  /* ================================================================
   * TOPBAR LAYOUT
   * ============================================================= */
  if (prefs.navLayout === 'topbar') {
    const topbarClass = katanaNav ? 'katana-topbar' : workdayNav ? 'workday-topbar' : ''
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
          className={`hidden md:flex items-center h-14 px-5 border-b border-gray-800 shrink-0 ${!effectiveNavColor ? 'bg-gray-900' : ''} ${topbarClass}`}
          style={navBg}
        >
          {/* Brand */}
          <NavLink to="/dashboard" className="font-bold text-white text-base tracking-tight mr-8 shrink-0 hover:opacity-80 transition-opacity">
            {isDev ? `DEV \u2014 ${prefs.instanceLabel || 'HRIS'}` : (prefs.instanceLabel || 'HRIS')}
          </NavLink>

          {/* Module groups - center */}
          <div className="flex items-center gap-0.5 flex-1 min-w-0">
            {filteredGroups.map((group, gi) => {
              if (!group.heading) {
                return group.items.map(({ to, label, icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-all whitespace-nowrap rounded-lg ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-400 shadow-sm'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                      }`
                    }
                  >
                    {icon}
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
                    `flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-all whitespace-nowrap rounded-lg ${
                      isGroupActive
                        ? 'bg-blue-600/20 text-blue-400 shadow-sm'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                    }`
                  }
                >
                  {group.items[0].icon}
                  <span>{group.heading}</span>
                </NavLink>
              )
            })}
          </div>

          {/* Right side - search, icons, user */}
          <div className="flex items-center gap-1 ml-4 shrink-0">
            <GlobalSearch navItems={allItems} />
            <div className="flex items-center gap-0.5 ml-2">
              {filteredGlobal.map(({ to, icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={label}
                  className={({ isActive }) =>
                    `flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`
                  }
                >
                  {icon}
                </NavLink>
              ))}
              <NotificationBell />
            </div>
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-gray-800">
              {user && (
                <Avatar name={user.name || user.email} size="sm" />
              )}
              <button
                onClick={handleLogout}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </nav>

        {/* Sub-navigation (desktop) */}
        {showSubNav && (
          <div className={`hidden md:flex items-center gap-1 px-5 h-11 border-b border-gray-800 bg-gray-900 shrink-0 katana-subnav ${workdayNav ? 'workday-subnav' : ''}`}>
            {activeGroup.items.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 h-full text-sm transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-white border-b-3 border-blue-400 font-medium'
                      : 'text-gray-400 hover:text-gray-200'
                  }`
                }
              >
                {icon}
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
          className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-gray-800 flex flex-col
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

          <VerticalNav
            onNavigate={closeSidebar}
            hasPermission={hasPermission}
            navGroups={enabledNavGroups}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleGroup}
          />

          <div className="px-4 py-3 border-t border-gray-800">
            {user && (
              <div className="flex items-center gap-3 mb-2">
                <Avatar name={user.name || user.email} size="sm" />
                <div className="min-w-0">
                  <div className="text-sm text-white font-medium truncate" title={user.email}>
                    {displayName}
                  </div>
                  {user.role && (
                    <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    )
  }

  /* ================================================================
   * SIDEBAR LAYOUT (default)
   * ============================================================= */
  const katanaSidebar = katanaNav ? 'katana-sidebar' : workdayNav ? 'workday-sidebar' : ''

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
        className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-gray-800 flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0
          ${!effectiveNavColor ? 'bg-gray-900' : ''} ${katanaSidebar}`}
        style={navBg}
      >
        {/* Brand area with gradient separator */}
        <NavLink to="/dashboard" className="block px-4 py-4 hover:opacity-80 transition-opacity" style={navBg}>
          <h1 className="text-lg font-bold tracking-tight" style={{ color: '#ffffff' }}>
            {isDev ? `DEV \u2014 ${prefs.instanceLabel || 'HRIS'}` : (prefs.instanceLabel || 'HRIS')}
          </h1>
        </NavLink>
        <div className="h-px bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800" />

        {/* Sidebar search */}
        <GlobalSearch navItems={allItems} sidebar />

        <VerticalNav
          onNavigate={closeSidebar}
          hasPermission={hasPermission}
          navGroups={enabledNavGroups}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
        />

        {/* User footer */}
        <div className="border-t border-gray-800">
          {user && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar name={user.name || user.email} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white font-medium truncate" title={user.email}>
                  {displayName}
                </div>
                {user.role && (
                  <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                )}
              </div>
            </div>
          )}
          <div className="px-4 pb-3">
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Main area with top utility bar + content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Utility bar (bell + user name) - desktop only */}
        <div className="hidden md:flex items-center justify-end px-6 py-2 border-b border-gray-800 bg-gray-950 shrink-0">
          <div className="flex items-center gap-2">
            <NotificationBell />
            {user && (
              <span className="text-xs text-gray-500 truncate max-w-32" title={user.email}>
                {displayName}
              </span>
            )}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pt-16 md:pt-6">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  )
}
