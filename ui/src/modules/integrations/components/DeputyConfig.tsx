import { useEffect, useState } from 'react'
import { fetchDeputyStatus, testDeputyConnection, syncDeputy, importDeputy } from '../api'
import { Toggle } from './Toggle'
import type { IntegrationConfigProps } from '../types'

export function DeputyConfig({ settings, onSettingsChange }: IntegrationConfigProps) {
  const [status, setStatus] = useState<{ configured: boolean; enabled: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [syncResult, setSyncResult] = useState('')
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState(String(settings.deputy_api_key || ''))
  const [locationId, setLocationId] = useState(String(settings.deputy_location_id || ''))

  useEffect(() => {
    fetchDeputyStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load Deputy status'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    onSettingsChange({ deputy_api_key: apiKey, deputy_location_id: locationId })
    setStatus(s => s ? { ...s, configured: !!apiKey } : null)
    setTestResult('')
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(''); setError('')
    try {
      await testDeputyConnection()
      setTestResult('Connected successfully!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally { setTesting(false) }
  }

  const handleSync = async () => {
    setSyncing(true); setSyncResult(''); setError('')
    try {
      const result = await syncDeputy()
      setSyncResult(`Found ${result.total} timesheets (${result.to_import} to import) for period ${result.period}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally { setSyncing(false) }
  }

  const handleImport = async () => {
    setImporting(true); setSyncResult(''); setError('')
    try {
      const result = await importDeputy()
      setSyncResult(`Imported: ${result.imported}, Skipped: ${result.skipped}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally { setImporting(false) }
  }

  if (loading) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Deputy</h3>
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
        <Toggle checked={!!settings.deputy_enabled} onChange={v => onSettingsChange({ deputy_enabled: v })} />
      </div>

      {!settings.deputy_enabled ? (
        <p className="text-xs text-gray-500">Integration disabled</p>
      ) : (
        <>
          {error && <div className="text-xs text-red-400">{error}</div>}
          {testResult && <div className="text-xs text-emerald-400">{testResult}</div>}
          {syncResult && <div className="text-xs text-emerald-400">{syncResult}</div>}

          <p className="text-xs text-gray-500">
            Import shift data and clock-in/out records from Deputy.
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">API Token</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="From Deputy → Settings → API Access"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Location ID</label>
              <input type="text" value={locationId} onChange={e => setLocationId(e.target.value)}
                placeholder="Deputy location ID (optional)"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleSave} disabled={!apiKey}
              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-30">
              Save
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
              {importing ? 'Importing...' : 'Import Timesheets'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
