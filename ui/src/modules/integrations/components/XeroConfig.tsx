import { useEffect, useState } from 'react'
import { fetchXeroStatus, testXeroConnection, syncXero, pushToXero } from '../api'
import { Toggle } from './Toggle'
import type { IntegrationConfigProps } from '../types'

export function XeroConfig({ settings, onSettingsChange }: IntegrationConfigProps) {
  const [status, setStatus] = useState<{ configured: boolean; enabled: boolean; org_name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [syncResult, setSyncResult] = useState('')
  const [error, setError] = useState('')
  const [clientId, setClientId] = useState(String(settings.xero_client_id || ''))
  const [clientSecret, setClientSecret] = useState(String(settings.xero_client_secret || ''))

  useEffect(() => {
    fetchXeroStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load Xero status'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    onSettingsChange({ xero_client_id: clientId, xero_client_secret: clientSecret })
    setStatus(s => s ? { ...s, configured: !!(clientId && clientSecret) } : null)
    setTestResult('')
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(''); setError('')
    try {
      await testXeroConnection()
      setTestResult('Connected successfully!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally { setTesting(false) }
  }

  const handleSync = async () => {
    setSyncing(true); setSyncResult(''); setError('')
    try {
      const result = await syncXero()
      setSyncResult(`Found ${result.journals} journals, total amount: $${result.total_amount} for period ${result.period}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally { setSyncing(false) }
  }

  const handlePush = async () => {
    setPushing(true); setSyncResult(''); setError('')
    try {
      const result = await pushToXero()
      setSyncResult(`Pushed ${result.pushed} entries. ${result.message}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Push failed')
    } finally { setPushing(false) }
  }

  if (loading) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Xero</h3>
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
        <Toggle checked={!!settings.xero_enabled} onChange={v => onSettingsChange({ xero_enabled: v })} />
      </div>

      {!settings.xero_enabled ? (
        <p className="text-xs text-gray-500">Integration disabled</p>
      ) : (
        <>
          {error && <div className="text-xs text-red-400">{error}</div>}
          {testResult && <div className="text-xs text-emerald-400">{testResult}</div>}
          {syncResult && <div className="text-xs text-emerald-400">{syncResult}</div>}

          <p className="text-xs text-gray-500">
            Sync payroll journals and employee costs to Xero accounting.
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Client ID</label>
              <input type="password" value={clientId} onChange={e => setClientId(e.target.value)}
                placeholder="From Xero Developer → My Apps"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Client Secret</label>
              <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                placeholder="From Xero Developer → My Apps"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleSave} disabled={!clientId || !clientSecret}
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
            <button onClick={handlePush} disabled={pushing || !status?.configured}
              className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50">
              {pushing ? 'Pushing...' : 'Push to Xero'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
