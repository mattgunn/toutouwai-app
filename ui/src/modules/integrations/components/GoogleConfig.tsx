import { useEffect, useState } from 'react'
import { fetchGoogleStatus, testGoogleConnection, syncGoogle, importGoogle, pushGoogle } from '../api'
import { Toggle } from './Toggle'
import type { IntegrationConfigProps } from '../types'

export function GoogleConfig({ settings, onSettingsChange }: IntegrationConfigProps) {
  const [status, setStatus] = useState<{ configured: boolean; enabled: boolean; domain: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [syncResult, setSyncResult] = useState('')
  const [error, setError] = useState('')
  const [clientEmail, setClientEmail] = useState(String(settings.google_client_email || ''))
  const [privateKey, setPrivateKey] = useState(String(settings.google_private_key || ''))
  const [domain, setDomain] = useState(String(settings.google_domain || ''))

  useEffect(() => {
    fetchGoogleStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load Google Workspace status'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    onSettingsChange({ google_client_email: clientEmail, google_private_key: privateKey, google_domain: domain })
    setStatus(s => s ? { ...s, configured: !!(clientEmail && privateKey) } : null)
    setTestResult('')
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(''); setError('')
    try {
      await testGoogleConnection()
      setTestResult('Connected successfully!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally { setTesting(false) }
  }

  const handleSync = async () => {
    setSyncing(true); setSyncResult(''); setError('')
    try {
      const result = await syncGoogle()
      setSyncResult(`Found ${result.total} users (${result.to_create} new, ${result.to_update} to update)`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally { setSyncing(false) }
  }

  const handleImport = async () => {
    setImporting(true); setSyncResult(''); setError('')
    try {
      const result = await importGoogle()
      setSyncResult(`Imported: ${result.results.created} created, ${result.results.updated} updated, ${result.results.skipped} skipped`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally { setImporting(false) }
  }

  const handlePush = async () => {
    setPushing(true); setSyncResult(''); setError('')
    try {
      const result = await pushGoogle()
      setSyncResult(`Provisioned: ${result.provisioned}, Suspended: ${result.suspended}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Push failed')
    } finally { setPushing(false) }
  }

  if (loading) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Google Workspace</h3>
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
        <Toggle checked={!!settings.google_enabled} onChange={v => onSettingsChange({ google_enabled: v })} />
      </div>

      {!settings.google_enabled ? (
        <p className="text-xs text-gray-500">Integration disabled</p>
      ) : (
        <>
          {error && <div className="text-xs text-red-400">{error}</div>}
          {testResult && <div className="text-xs text-emerald-400">{testResult}</div>}
          {syncResult && <div className="text-xs text-emerald-400">{syncResult}</div>}

          <p className="text-xs text-gray-500">
            SSO login, auto-provision Google accounts on hire, suspend on termination.
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Service Account Email</label>
              <input type="text" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
                placeholder="service-account@project.iam.gserviceaccount.com"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Private Key</label>
              <textarea value={privateKey} onChange={e => setPrivateKey(e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 font-mono" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Domain</label>
              <input type="text" value={domain} onChange={e => setDomain(e.target.value)}
                placeholder="company.co.nz"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
          </div>

          {/* Auto-provision toggles */}
          <div className="space-y-1">
            <div className="flex items-center justify-between py-1">
              <label className="text-xs text-gray-400">Auto-provision on hire</label>
              <Toggle
                checked={!!settings.google_auto_provision}
                onChange={v => onSettingsChange({ google_auto_provision: v })}
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <label className="text-xs text-gray-400">Auto-suspend on termination</label>
              <Toggle
                checked={!!settings.google_auto_suspend}
                onChange={v => onSettingsChange({ google_auto_suspend: v })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleSave} disabled={!clientEmail || !privateKey}
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
              {importing ? 'Importing...' : 'Import Users'}
            </button>
            <button onClick={handlePush} disabled={pushing || !status?.configured}
              className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50">
              {pushing ? 'Provisioning...' : 'Provision Accounts'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
