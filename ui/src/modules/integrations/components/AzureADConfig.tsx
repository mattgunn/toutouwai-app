import { useEffect, useState } from 'react'
import { fetchAzureADStatus, disconnectAzureAD, syncAzureAD, importAzureAD } from '../api'
import { Toggle } from './Toggle'
import type { IntegrationConfigProps } from '../types'

export function AzureADConfig({ settings, onSettingsChange }: IntegrationConfigProps) {
  const [status, setStatus] = useState<{ connected: boolean; enabled: boolean; has_credentials: boolean; tenant_id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [syncResult, setSyncResult] = useState('')
  const [error, setError] = useState('')

  const loadStatus = () => {
    fetchAzureADStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load Azure AD status'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStatus() }, [])

  const handleConnect = () => {
    // Redirect to OAuth — the backend will redirect to Microsoft
    window.location.href = '/api/integrations/azure-ad/connect'
  }

  const handleDisconnect = async () => {
    try {
      await disconnectAzureAD()
      setStatus(s => s ? { ...s, connected: false } : null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Disconnect failed')
    }
  }

  const handleSync = async () => {
    setSyncing(true); setSyncResult(''); setError('')
    try {
      const result = await syncAzureAD()
      setSyncResult(`Found ${result.total} users (${result.to_create} new, ${result.to_update} to update)`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally { setSyncing(false) }
  }

  const handleImport = async () => {
    setImporting(true); setSyncResult(''); setError('')
    try {
      const result = await importAzureAD()
      const emp = result.results.employees || { created: 0, updated: 0, skipped: 0 }
      const dept = result.results.departments
      let msg = `Employees: ${emp.created} created, ${emp.updated} updated, ${emp.skipped} skipped`
      if (dept) msg += ` | Departments: ${dept.created} created, ${dept.updated} updated`
      setSyncResult(msg)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally { setImporting(false) }
  }

  if (loading) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Azure AD / Entra ID</h3>
          {status?.connected ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
              Not connected
            </span>
          )}
        </div>
        <Toggle checked={!!settings.azure_ad_enabled} onChange={v => onSettingsChange({ azure_ad_enabled: v })} />
      </div>

      {!settings.azure_ad_enabled ? (
        <p className="text-xs text-gray-500">Integration disabled</p>
      ) : (
        <>
          {error && <div className="text-xs text-red-400">{error}</div>}
          {syncResult && <div className="text-xs text-emerald-400">{syncResult}</div>}

          <p className="text-xs text-gray-500">
            Bidirectional sync with Microsoft Entra ID. Sync users and groups, provision AD accounts on hire, disable on termination. SSO login with Microsoft.
          </p>

          {!status?.has_credentials && (
            <div className="text-xs text-amber-400 bg-amber-600/10 border border-amber-600/20 rounded p-2">
              Azure AD credentials not found. Add AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID to your .env file.
            </div>
          )}

          {/* Sync groups as departments toggle */}
          <div className="flex items-center justify-between py-1">
            <label className="text-xs text-gray-400">Sync groups as departments</label>
            <Toggle
              checked={!!settings.azure_ad_sync_groups_as_departments}
              onChange={v => onSettingsChange({ azure_ad_sync_groups_as_departments: v })}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {status?.connected ? (
              <button onClick={handleDisconnect}
                className="text-xs px-3 py-1.5 border border-red-800 rounded text-red-400 hover:text-red-300 hover:border-red-700 transition-colors">
                Disconnect
              </button>
            ) : (
              <button onClick={handleConnect} disabled={!status?.has_credentials}
                className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-30">
                Connect to Microsoft
              </button>
            )}
            <button onClick={handleSync} disabled={syncing || !status?.connected}
              className="text-xs px-3 py-1.5 border border-gray-700 rounded text-gray-300 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50">
              {syncing ? 'Syncing...' : 'Preview Sync'}
            </button>
            <button onClick={handleImport} disabled={importing || !status?.connected}
              className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50">
              {importing ? 'Importing...' : 'Import Users & Groups'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
