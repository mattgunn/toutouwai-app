import { useEffect, useState } from 'react'
import { fetchTeamsStatus, testTeamsConnection, sendTeamsNotification } from '../api'
import { Toggle } from './Toggle'
import type { IntegrationConfigProps } from '../types'

const NOTIFICATION_OPTIONS = [
  { key: 'teams_notify_leave', label: 'Leave approvals' },
  { key: 'teams_notify_new_hires', label: 'New hires' },
  { key: 'teams_notify_onboarding', label: 'Onboarding updates' },
] as const

export function TeamsConfig({ settings, onSettingsChange }: IntegrationConfigProps) {
  const [status, setStatus] = useState<{ configured: boolean; enabled: boolean } | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [notifyResult, setNotifyResult] = useState('')
  const [error, setError] = useState('')
  const [webhookUrl, setWebhookUrl] = useState(String(settings.teams_webhook_url || ''))

  useEffect(() => {
    fetchTeamsStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load Teams status'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    onSettingsChange({ teams_webhook_url: webhookUrl })
    setStatus(s => s ? { ...s, configured: !!webhookUrl } : null)
    setTestResult('')
    setNotifyResult('')
  }

  const handleTest = async () => {
    setTesting(true); setTestResult(''); setError('')
    try {
      await testTeamsConnection()
      setTestResult('Connected successfully!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally { setTesting(false) }
  }

  const handleNotify = async () => {
    setNotifying(true); setNotifyResult(''); setError('')
    try {
      await sendTeamsNotification()
      setNotifyResult('Test message sent!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Send notification failed')
    } finally { setNotifying(false) }
  }

  if (loading) return null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Microsoft Teams</h3>
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
        <Toggle checked={!!settings.teams_enabled} onChange={v => onSettingsChange({ teams_enabled: v })} />
      </div>

      {!settings.teams_enabled ? (
        <p className="text-xs text-gray-500">Integration disabled</p>
      ) : (
        <>
          {error && <div className="text-xs text-red-400">{error}</div>}
          {testResult && <div className="text-xs text-emerald-400">{testResult}</div>}
          {notifyResult && <div className="text-xs text-emerald-400">{notifyResult}</div>}

          <p className="text-xs text-gray-500">
            Send HR notifications to Microsoft Teams channels via webhooks
          </p>

          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Incoming Webhook URL</label>
              <input type="password" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://outlook.office.com/webhook/..."
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600" />
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-xs text-gray-400 font-medium">Notifications</p>
            {NOTIFICATION_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!settings[opt.key]}
                  onChange={e => onSettingsChange({ [opt.key]: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={handleSave} disabled={!webhookUrl}
              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-30">
              Save
            </button>
            <button onClick={handleTest} disabled={testing || !status?.configured}
              className="text-xs px-3 py-1.5 border border-gray-700 rounded text-gray-300 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50">
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button onClick={handleNotify} disabled={notifying || !status?.configured}
              className="text-xs px-3 py-1.5 border border-gray-700 rounded text-gray-300 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50">
              {notifying ? 'Sending...' : 'Send Test Message'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
