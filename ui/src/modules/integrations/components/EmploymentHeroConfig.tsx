import { useEffect, useState } from 'react'
import { fetchEmploymentHeroStatus, testEmploymentHeroConnection, syncEmploymentHero, importEmploymentHero, pushEmploymentHero } from '../api'
import { Toggle } from './Toggle'
import type { IntegrationConfigProps } from '../types'

export function EmploymentHeroConfig({ settings, onSettingsChange }: IntegrationConfigProps) {
  const [status, setStatus] = useState<{ configured: boolean; enabled: boolean; org: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [syncResult, setSyncResult] = useState('')
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState(String(settings.eh_api_key || ''))
  const [orgId, setOrgId] = useState(String(settings.eh_org_id || ''))

  useEffect(() => {
    fetchEmploymentHeroStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load Employment Hero status'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    onSettingsChange({ eh_api_key: apiKey, eh_org_id: orgId })
    setStatus(s => s ? { ...s, configured: !!(apiKey && orgId) } : null)
    setTestResult('')
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(''); setError('')
    try {
      await testEmploymentHeroConnection()
      setTestResult('Connected successfully!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally { setTesting(false) }
  }

  const handleSync = async () => {
    setSyncing(true); setSyncResult(''); setError('')
    try {
      const result = await syncEmploymentHero()
      setSyncResult(`Found ${result.employees} employees, ${result.documents} documents (${result.to_import} to import)`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally { setSyncing(false) }
  }

  const handleImport = async () => {
    setImporting(true); setSyncResult(''); setError('')
    try {
      const result = await importEmploymentHero()
      setSyncResult(`Imported: ${result.imported} employees, ${result.documents} documents, Skipped: ${result.skipped}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally { setImporting(false) }
  }

  const handlePush = async () => {
    setPushing(true); setSyncResult(''); setError('')
    try {
      const result = await pushEmploymentHero()
      setSyncResult(`Pushed: ${result.pushed} employees, ${result.agreements} agreements`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Push failed')
    } finally { setPushing(false) }
  }

  if (loading) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Employment Hero</h3>
          {status?.configured ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Configured
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              Not configured
            </span>
          )}
        </div>
        <Toggle checked={!!settings.eh_enabled} onChange={v => onSettingsChange({ eh_enabled: v })} />
      </div>

      {!settings.eh_enabled ? (
        <p className="text-xs text-gray-500">Integration disabled</p>
      ) : (
        <>
          {error && <div className="text-xs text-red-400">{error}</div>}
          {testResult && <div className="text-xs text-emerald-400">{testResult}</div>}
          {syncResult && <div className="text-xs text-emerald-400">{syncResult}</div>}

          <p className="text-xs text-gray-500">
            NZ employment agreements, benefits marketplace, and compliance documents via Employment Hero.
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="Employment Hero API key"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Organisation ID</label>
              <input type="text" value={orgId} onChange={e => setOrgId(e.target.value)}
                placeholder="Your Employment Hero organisation ID"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!settings.eh_sync_agreements}
                onChange={e => onSettingsChange({ eh_sync_agreements: e.target.checked })}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500" />
              Sync employment agreements
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!settings.eh_import_compliance}
                onChange={e => onSettingsChange({ eh_import_compliance: e.target.checked })}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500" />
              Import compliance documents
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!settings.eh_auto_sync_benefits}
                onChange={e => onSettingsChange({ eh_auto_sync_benefits: e.target.checked })}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500" />
              Auto-sync benefits
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleSave} disabled={!apiKey || !orgId}
              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-30">
              Save Keys
            </button>
            <button onClick={handleTest} disabled={testing || !status?.configured}
              className="text-xs px-3 py-1.5 border border-gray-700 rounded text-gray-300 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50">
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button onClick={handleSync} disabled={syncing || !status?.configured}
              className="text-xs px-3 py-1.5 border border-gray-700 rounded text-gray-300 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50">
              {syncing ? 'Syncing...' : 'Preview Sync'}
            </button>
            <button onClick={handleImport} disabled={importing || !status?.configured}
              className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50">
              {importing ? 'Importing...' : 'Import Data'}
            </button>
            <button onClick={handlePush} disabled={pushing || !status?.configured}
              className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50">
              {pushing ? 'Pushing...' : 'Push to EH'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
