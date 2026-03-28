import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { requestLoginLink } from '../api'
import { fetchAzureADStatus } from '../modules/integrations/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [azureEnabled, setAzureEnabled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchAzureADStatus()
      .then(s => setAzureEnabled(s.connected && s.enabled))
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await requestLoginLink(email)
      navigate('/link-sent')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send login link'
      setError(msg === 'Failed to fetch' ? 'Cannot reach server — is the backend running?' : msg)
    } finally {
      setLoading(false)
    }
  }

  const handleMicrosoftSSO = () => {
    // Redirect to Microsoft OAuth for SSO
    // On return, the callback will post the ID token to our API
    window.location.href = '/api/integrations/azure-ad/connect'
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-1">HRIS</h1>
        <p className="text-gray-500 text-sm mb-6">Sign in to your account</p>

        {/* Microsoft SSO button */}
        {azureEnabled && (
          <>
            <button
              onClick={handleMicrosoftSSO}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors mb-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
              Sign in with Microsoft
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-600 text-xs">or</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
          </>
        )}

        {/* Email magic link form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-500"
          />

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send login link'}
          </button>
        </form>
      </div>
    </div>
  )
}
