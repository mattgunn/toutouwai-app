export const BASE = '/api'

export function authHeaders(): HeadersInit {
  const jwt = localStorage.getItem('hris_jwt')
  return jwt ? { Authorization: `Bearer ${jwt}` } : {}
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
    cache: 'no-store',
  })
  if (res.status === 401) {
    localStorage.removeItem('hris_jwt')
    window.location.href = '/login'
  }
  return res
}

export async function jsonPost(url: string, body: unknown): Promise<Response> {
  return authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function jsonPut(url: string, body: unknown): Promise<Response> {
  return authFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function jsonDelete(url: string): Promise<Response> {
  return authFetch(url, { method: 'DELETE' })
}
