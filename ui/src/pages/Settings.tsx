import { useState } from 'react'
import { useAdminPrefs } from '../hooks/useAdminPrefs'
import { updateSettings, authFetch } from '../api'
import { INTEGRATIONS } from '../modules/integrations/registry'
import { useToast } from '../components/Toast'
import Button from '../components/Button'

type Tab = 'appearance' | 'integrations' | 'developer'

export default function Settings() {
  const prefs = useAdminPrefs()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('appearance')
  const [integrationSettings, setIntegrationSettings] = useState<Record<string, unknown>>({})
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [seedResult, setSeedResult] = useState<Record<string, number> | null>(null)

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
    if (!confirm('This will DELETE all employees, leave, recruitment, and other data. Users and settings will be kept. Continue?')) return
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'appearance', label: 'Appearance' },
    { key: 'integrations', label: 'Integrations' },
    { key: 'developer', label: 'Developer' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-white border-b-2 border-blue-400 -mb-px'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Appearance tab */}
      {tab === 'appearance' && (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-white mb-4">Appearance</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Theme</label>
                <div className="flex gap-2">
                  {(['dark', 'light', 'katana', 'workday'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => prefs.setTheme(t)}
                      className={`px-3 py-1.5 text-sm rounded capitalize transition-colors ${
                        prefs.theme === t
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Navigation Layout</label>
                <div className="flex gap-2">
                  {(['sidebar', 'topbar'] as const).map(l => (
                    <button
                      key={l}
                      onClick={() => prefs.setNavLayout(l)}
                      className={`px-3 py-1.5 text-sm rounded capitalize transition-colors ${
                        prefs.navLayout === l
                          ? 'bg-blue-600/20 text-blue-400'
                          : 'text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Instance Label</label>
                <input
                  type="text"
                  value={prefs.instanceLabel}
                  onChange={e => prefs.setInstanceLabel(e.target.value)}
                  placeholder="HRIS"
                  className="w-full max-w-xs bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Nav Color</label>
                <input
                  type="color"
                  value={prefs.navColor || '#1f2937'}
                  onChange={e => prefs.setNavColor(e.target.value)}
                  className="w-10 h-8 border border-gray-700 rounded cursor-pointer"
                />
                {prefs.navColor && (
                  <button
                    onClick={() => prefs.setNavColor('')}
                    className="ml-2 text-xs text-gray-500 hover:text-gray-300"
                  >
                    Reset
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Favicon Color</label>
                <input
                  type="color"
                  value={prefs.faviconColor || '#2563eb'}
                  onChange={e => prefs.setFaviconColor(e.target.value)}
                  className="w-10 h-8 border border-gray-700 rounded cursor-pointer"
                />
                {prefs.faviconColor && (
                  <button
                    onClick={() => prefs.setFaviconColor('')}
                    className="ml-2 text-xs text-gray-500 hover:text-gray-300"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integrations tab */}
      {tab === 'integrations' && (
        <div className="space-y-4 max-w-2xl">
          {INTEGRATIONS.map(integration => {
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
      )}

      {/* Developer tab */}
      {tab === 'developer' && (
        <div className="space-y-6 max-w-2xl">
          {/* Mode indicator */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-white mb-2">Environment</h2>
            <p className="text-xs text-gray-500 mb-3">
              Development tools for testing and populating the application with sample data.
            </p>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-600/20 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Development Mode
              </span>
            </div>
          </div>

          {/* Seed data */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-white mb-2">Seed Database</h2>
            <p className="text-xs text-gray-500 mb-4">
              Populate the database with realistic NZ-based dummy data across all modules:
              departments, employees, leave, timesheets, recruitment, reviews, goals,
              compensation, benefits, succession plans, onboarding, documents, surveys,
              workflows, and audit logs.
            </p>

            <div className="flex gap-3">
              <Button variant="primary" loading={seeding} onClick={handleSeed}>
                {seeding ? 'Seeding...' : 'Seed Database'}
              </Button>
              <Button variant="danger" loading={clearing} onClick={handleClear}>
                {clearing ? 'Clearing...' : 'Clear All Data'}
              </Button>
            </div>

            {seedResult && (
              <div className="mt-4 bg-gray-800 rounded-lg p-3">
                <h3 className="text-xs font-semibold text-emerald-400 mb-2">Seed Complete</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(seedResult).map(([table, count]) => (
                    <div key={table} className="flex justify-between text-xs">
                      <span className="text-gray-400">{table.replace(/_/g, ' ')}</span>
                      <span className="text-white font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* API info */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-white mb-2">API Documentation</h2>
            <p className="text-xs text-gray-500 mb-3">
              FastAPI auto-generated docs are available at:
            </p>
            <div className="space-y-1">
              <a href="/api/docs" target="_blank" rel="noopener noreferrer"
                className="block text-xs text-blue-400 hover:text-blue-300">
                /api/docs — Swagger UI
              </a>
              <a href="/api/redoc" target="_blank" rel="noopener noreferrer"
                className="block text-xs text-blue-400 hover:text-blue-300">
                /api/redoc — ReDoc
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
