export const BASE = '/api'

export function authHeaders(): HeadersInit {
  const jwt = localStorage.getItem('hris_jwt')
  return jwt ? { Authorization: `Bearer ${jwt}` } : {}
}

async function fetchWithRetry(url: string, init?: RequestInit, retries = 3): Promise<Response> {
  try {
    const res = await fetch(url, init)
    // Retry on 502/503/504 (proxy not ready, server restarting)
    if (retries > 0 && (res.status >= 502 && res.status <= 504)) {
      await new Promise(r => setTimeout(r, 800))
      return fetchWithRetry(url, init, retries - 1)
    }
    // Retry on empty/error responses that look like proxy not ready
    if (retries > 0 && res.status === 0) {
      await new Promise(r => setTimeout(r, 800))
      return fetchWithRetry(url, init, retries - 1)
    }
    return res
  } catch (err) {
    // Retry on network errors (fetch failed, connection refused, proxy not ready)
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 800))
      return fetchWithRetry(url, init, retries - 1)
    }
    throw err
  }
}

export async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetchWithRetry(url, {
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
