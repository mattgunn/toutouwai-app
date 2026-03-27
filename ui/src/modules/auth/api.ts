import { BASE } from '../shared/api'

export async function requestLoginLink(email: string) {
  const res = await fetch(`${BASE}/auth/request-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  return res.json()
}

export async function verifyToken(token: string): Promise<{ jwt: string }> {
  const res = await fetch(`${BASE}/auth/verify?token=${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error('Invalid or expired link')
  return res.json()
}
