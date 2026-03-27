import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { verifyToken } from '../api'
import { useAuth } from '../auth'

export default function Verify() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setError('No token provided')
      return
    }

    verifyToken(token)
      .then(({ jwt }) => {
        login(jwt)
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        setError('Invalid or expired login link')
      })
  }, [searchParams, login, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-bold text-red-400 mb-2">Login failed</h1>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <Link to="/login" className="text-blue-400 hover:text-blue-300 text-sm">
            Try again
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500">Verifying...</p>
    </div>
  )
}
