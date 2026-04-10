import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

const BASE = '/api'

export interface UserProfile {
  id: string
  name: string
  role: string
  email: string
  permissions: string[]
  is_super_admin: boolean
}

interface AuthContextType {
  user: UserProfile | null
  jwt: string | null
  loading: boolean
  login: (jwt: string) => void
  logout: () => void
  hasPermission: (module: string) => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  jwt: null,
  loading: true,
  login: () => {},
  logout: () => {},
  hasPermission: () => false,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [jwt, setJwt] = useState<string | null>(localStorage.getItem('hris_jwt'))
  const [loading, setLoading] = useState(true)

  const login = useCallback((newJwt: string) => {
    localStorage.setItem('hris_jwt', newJwt)
    setLoading(true)
    setJwt(newJwt)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('hris_jwt')
    setJwt(null)
    setUser(null)
  }, [])

  const hasPermission = useCallback(
    (module: string) => {
      if (!user) return false
      if (user.role === 'admin' || user.is_super_admin) return true
      return user.permissions.includes(module)
    },
    [user],
  )

  useEffect(() => {
    if (!jwt) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchMe = (attempt = 1) => {
      fetch(`${BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      })
        .then(res => {
          if (!res.ok) throw new Error(res.status === 401 ? 'Unauthorized' : 'ServerError')
          return res.json()
        })
        .then((profile: UserProfile) => {
          if (!cancelled) {
            setUser(profile)
            setLoading(false)
          }
        })
        .catch(err => {
          if (cancelled) return
          // Retry on network/server errors (not auth failures)
          if (err.message !== 'Unauthorized' && attempt < 3) {
            setTimeout(() => fetchMe(attempt + 1), 1000 * attempt)
            return
          }
          localStorage.removeItem('hris_jwt')
          setJwt(null)
          setLoading(false)
        })
    }

    fetchMe()
    return () => { cancelled = true }
  }, [jwt])

  return (
    <AuthContext.Provider value={{ user, jwt, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    window.location.href = '/login'
    return null
  }

  return <>{children}</>
}

export function ModuleGuard({ module, children }: { module: string; children: ReactNode }) {
  const { hasPermission } = useAuth()

  if (!hasPermission(module)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
