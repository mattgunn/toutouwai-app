import { useEffect, useState } from 'react'
import { fetchSmartRecruitersStatus, testSmartRecruitersConnection, syncSmartRecruiters, importSmartRecruiters, pushSmartRecruiters } from '../api'
import { Toggle } from './Toggle'
import type { IntegrationConfigProps } from '../types'

export function SmartRecruitersConfig({ settings, onSettingsChange }: IntegrationConfigProps) {
  const [status, setStatus] = useState<{ configured: boolean; enabled: boolean; company: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [syncResult, setSyncResult] = useState('')
  const [error, setError] = useState('')
  const [apiKey, setApiKey] = useState(String(settings.sr_api_key || ''))
  const [companyId, setCompanyId] = useState(String(settings.sr_company_id || ''))

  useEffect(() => {
    fetchSmartRecruitersStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load SmartRecruiters status'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    onSettingsChange({ sr_api_key: apiKey, sr_company_id: companyId })
    setStatus(s => s ? { ...s, configured: !!apiKey } : null)
    setTestResult('')
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(''); setError('')
    try {
      await testSmartRecruitersConnection()
      setTestResult('Connected successfully!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally { setTesting(false) }
  }

  const handleSync = async () => {
    setSyncing(true); setSyncResult(''); setError('')
    try {
      const result = await syncSmartRecruiters()
      setSyncResult(`Found ${result.jobs} jobs, ${result.applicants} applicants (${result.to_import} to import)`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally { setSyncing(false) }
  }

  const handleImport = async () => {
    setImporting(true); setSyncResult(''); setError('')
    try {
      const result = await importSmartRecruiters()
      setSyncResult(`Imported: ${result.imported}, Skipped: ${result.skipped}, Errors: ${result.errors}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally { setImporting(false) }
  }

  const handlePush = async () => {
    setPushing(true); setSyncResult(''); setError('')
    try {
      const result = await pushSmartRecruiters()
      setSyncResult(`Posted: ${result.posted}, Updated: ${result.updated}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Push failed')
    } finally { setPushing(false) }
  }

  if (loading) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">SmartRecruiters</h3>
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
        <Toggle checked={!!settings.sr_enabled} onChange={v => onSettingsChange({ sr_enabled: v })} />
      </div>

      {!settings.sr_enabled ? (
        <p className="text-xs text-gray-500">Integration disabled</p>
      ) : (
        <>
          {error && <div className="text-xs text-red-400">{error}</div>}
          {testResult && <div className="text-xs text-emerald-400">{testResult}</div>}
          {syncResult && <div className="text-xs text-emerald-400">{syncResult}</div>}

          <p className="text-xs text-gray-500">
            Sync job postings and import applicants from SmartRecruiters ATS.
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="SmartRecruiters API key"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Company ID</label>
              <input type="text" value={companyId} onChange={e => setCompanyId(e.target.value)}
                placeholder="Your SmartRecruiters company ID"
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!settings.sr_auto_import}
                onChange={e => onSettingsChange({ sr_auto_import: e.target.checked })}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500" />
              Auto-import new applicants
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={!!settings.sr_sync_job_status}
                onChange={e => onSettingsChange({ sr_sync_job_status: e.target.checked })}
                className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500" />
              Sync job posting status
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleSave} disabled={!apiKey}
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
              {importing ? 'Importing...' : 'Import Applicants'}
            </button>
            <button onClick={handlePush} disabled={pushing || !status?.configured}
              className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50">
              {pushing ? 'Pushing...' : 'Push Postings'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
