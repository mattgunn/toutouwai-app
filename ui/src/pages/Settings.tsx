import { useState, useEffect } from 'react'
import { useAdminPrefs } from '../hooks/useAdminPrefs'
import { updateSettings, fetchSettings, authFetch } from '../api'
import { INTEGRATIONS, INTEGRATION_CATEGORIES, type IntegrationCategory } from '../modules/integrations/registry'
import { MODULES } from '../modules/modules/registry'
import { useToast } from '../components/Toast'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import Tabs from '../components/Tabs'

type Tab = 'appearance' | 'modules' | 'integrations' | 'developer'

export default function Settings() {
  const prefs = useAdminPrefs()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('appearance')
  const [integrationSettings, setIntegrationSettings] = useState<Record<string, unknown>>({})
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [seedResult, setSeedResult] = useState<Record<string, number> | null>(null)
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | 'all'>('all')
  const [moduleSettings, setModuleSettings] = useState<Record<string, unknown>>({})

  useEffect(() => {
    fetchSettings().then(s => {
      setIntegrationSettings(s)
      setModuleSettings(s)
    }).catch(() => toast.error('Failed to load settings'))
  }, [])

  const handleModuleToggle = (enabledKey: string, enabled: boolean) => {
    const updates = { [enabledKey]: enabled }
    setModuleSettings(prev => ({ ...prev, ...updates }))
    updateSettings(updates).catch(() => {})
    toast.success(`Module ${enabled ? 'enabled' : 'disabled'}. Refresh to see nav changes.`)
  }

  const handleIntegrationChange = (updates: Record<string, unknown>) => {
    const merged = { ...integrationSettings, ...updates }
    setIntegrationSettings(merged)
    updateSettings(updates).catch(() => {})
  }

  const handleSeed = async () => {
    setSeeding(true)
    setSeedResult(null)
    try {
      const res = await authFetch('/api/seed', { method: 'POST' })
      if (!res.ok) throw new Error('Seed failed')
      const data = await res.json()
      setSeedResult(data.counts)
      toast.success('Database seeded with dummy data! Refresh pages to see data.')
    } catch {
      toast.error('Failed to seed database')
    } finally {
      setSeeding(false)
    }
  }

  const handleClear = async () => {
    setShowClearConfirm(false)
    setClearing(true)
    setSeedResult(null)
    try {
      const res = await authFetch('/api/seed', { method: 'DELETE' })
      if (!res.ok) throw new Error('Clear failed')
      toast.success('All data cleared. Database is now empty (users kept).')
    } catch {
      toast.error('Failed to clear database')
    } finally {
      setClearing(false)
    }
  }

  const filteredIntegrations = activeCategory === 'all'
    ? INTEGRATIONS
    : INTEGRATIONS.filter(i => i.category === activeCategory)

  const enabledModuleCount = MODULES.filter(m => moduleSettings[m.enabledKey] !== false).length

  const tabs = [
    { key: 'appearance' as const, label: 'Appearance' },
    { key: 'modules' as const, label: 'Modules', count: enabledModuleCount },
    { key: 'integrations' as const, label: 'Integrations', count: INTEGRATIONS.length },
    { key: 'developer' as const, label: 'Developer' },
  ]

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="mb-6">
        <Tabs
          tabs={tabs}
          active={tab}
          onChange={(k) => setTab(k as Tab)}
        />
      </div>

      {/* ── Appearance Tab ── */}
      {tab === 'appearance' && (
        <div className="space-y-6 max-w-2xl">
          {/* Theme */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Theme & Layout</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Theme</label>
                <div className="flex gap-2">
                  {(['dark', 'light', 'katana', 'workday'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => prefs.setTheme(t)}
                      className={`px-4 py-2 text-sm rounded-lg capitalize transition-all ${
                        prefs.theme === t
                          ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                          : 'text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">Navigation Layout</label>
                <div className="flex gap-2">
                  {(['sidebar', 'topbar'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => prefs.setNavLayout(l)}
                      className={`px-4 py-2 text-sm rounded-lg capitalize transition-all ${
                        prefs.navLayout === l
                          ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30'
                          : 'text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Branding</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Instance Label</label>
                <input
                  type="text"
                  value={prefs.instanceLabel}
                  onChange={e => prefs.setInstanceLabel(e.target.value)}
                  placeholder="HRIS"
                  className="w-full max-w-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                />
              </div>

              <div className="flex gap-6">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nav Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={prefs.navColor || '#1f2937'}
                      onChange={e => prefs.setNavColor(e.target.value)}
                      className="w-10 h-8 border border-gray-700 rounded cursor-pointer"
                    />
                    {prefs.navColor && (
                      <button onClick={() => prefs.setNavColor('')} className="text-xs text-gray-500 hover:text-gray-300">
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Favicon Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={prefs.faviconColor || '#2563eb'}
                      onChange={e => prefs.setFaviconColor(e.target.value)}
                      className="w-10 h-8 border border-gray-700 rounded cursor-pointer"
                    />
                    {prefs.faviconColor && (
                      <button onClick={() => prefs.setFaviconColor('')} className="text-xs text-gray-500 hover:text-gray-300">
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modules Tab ── */}
      {tab === 'modules' && (
        <div className="space-y-4 max-w-2xl">
          <p className="text-sm text-gray-500 mb-4">
            Enable or disable modules to customise which features are available in the navigation and throughout the app.
            Disabled modules are hidden from the sidebar but data is preserved.
          </p>
          {MODULES.map(mod => {
            const enabled = moduleSettings[mod.enabledKey] !== false
            return (
              <div key={mod.key} className="bg-gray-900 border border-gray-800 rounded-lg p-5 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{mod.label}</h3>
                    {enabled ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{mod.description}</p>
                  {mod.navGroups.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      Nav sections: {mod.navGroups.join(', ')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleModuleToggle(mod.enabledKey, !enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                    enabled ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Integrations Tab ── */}
      {tab === 'integrations' && (
        <div className="flex gap-6">
          {/* Category sidebar */}
          <div className="hidden md:block w-48 shrink-0">
            <nav className="sticky top-6 space-y-1">
              <button
                onClick={() => setActiveCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  activeCategory === 'all'
                    ? 'bg-blue-600/20 text-blue-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                All Integrations
                <span className="ml-2 text-xs text-gray-500">{INTEGRATIONS.length}</span>
              </button>
              {INTEGRATION_CATEGORIES.map(cat => {
                const count = INTEGRATIONS.filter(i => i.category === cat.key).length
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                      activeCategory === cat.key
                        ? 'bg-blue-600/20 text-blue-400 font-medium'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                    }`}
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.label}
                    <span className="ml-2 text-xs text-gray-500">{count}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Mobile category pills */}
          <div className="md:hidden flex flex-wrap gap-2 mb-4 w-full">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeCategory === 'all' ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-800 text-gray-400'
              }`}
            >
              All
            </button>
            {INTEGRATION_CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat.key ? 'bg-blue-600/20 text-blue-400' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>

          {/* Integration cards */}
          <div className="flex-1 space-y-4 max-w-2xl">
            {activeCategory !== 'all' && (
              <div className="mb-2">
                <h2 className="text-sm font-semibold text-white">
                  {INTEGRATION_CATEGORIES.find(c => c.key === activeCategory)?.icon}{' '}
                  {INTEGRATION_CATEGORIES.find(c => c.key === activeCategory)?.label}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {filteredIntegrations.length} integration{filteredIntegrations.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            {filteredIntegrations.map(integration => {
              const Component = integration.component
              return (
                <Component
                  key={integration.key}
                  settings={integrationSettings}
                  onSettingsChange={handleIntegrationChange}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* ── Developer Tab ── */}
      {tab === 'developer' && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Environment</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-600/20 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Development
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Development tools for testing and populating the application with sample data.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-white mb-2">Seed Database</h2>
            <p className="text-xs text-gray-500 mb-4">
              Populate with realistic NZ-based dummy data across all modules — departments, employees,
              leave, timesheets, recruitment, reviews, goals, compensation, benefits, succession,
              onboarding, documents, surveys, workflows, and audit logs.
            </p>

            <div className="flex gap-3">
              <Button variant="primary" loading={seeding} onClick={handleSeed}>
                {seeding ? 'Seeding...' : 'Seed Database'}
              </Button>
              <Button variant="danger" loading={clearing} onClick={() => setShowClearConfirm(true)}>
                {clearing ? 'Clearing...' : 'Clear All Data'}
              </Button>
            </div>

            {seedResult && (
              <div className="mt-4 bg-gray-800 rounded-lg p-4">
                <h3 className="text-xs font-semibold text-emerald-400 mb-3">Seed Complete</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                  {Object.entries(seedResult).map(([table, count]) => (
                    <div key={table} className="flex justify-between text-xs">
                      <span className="text-gray-400 capitalize">{table.replace(/_/g, ' ')}</span>
                      <span className="text-white font-mono tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-white mb-3">API Documentation</h2>
            <div className="flex gap-3">
              <a href="/api/docs" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-800 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-all">
                <span className="text-lg">📖</span>
                <div>
                  <p className="font-medium">Swagger UI</p>
                  <p className="text-xs text-gray-500">/api/docs</p>
                </div>
              </a>
              <a href="/api/redoc" target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center gap-2 px-4 py-3 bg-gray-800 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-all">
                <span className="text-lg">📚</span>
                <div>
                  <p className="font-medium">ReDoc</p>
                  <p className="text-xs text-gray-500">/api/redoc</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClear}
        title="Clear All Data"
        message="This will DELETE all employees, leave, recruitment, and other data. Users and settings will be kept. This action cannot be undone."
        confirmLabel="Clear All Data"
        loading={clearing}
      />
    </div>
  )
}
