import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { Document } from './types'

export async function fetchDocuments(params?: Record<string, string>): Promise<Document[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  const res = await authFetch(`${BASE}/documents${qs}`)
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

export async function createDocument(body: unknown): Promise<Document> {
  const res = await jsonPost(`${BASE}/documents`, body)
  if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create document')
  return res.json()
}

export async function updateDocument(id: string, body: unknown): Promise<Document> {
  const res = await jsonPut(`${BASE}/documents/${id}`, body)
  if (!res.ok) throw new Error('Failed to update document')
  return res.json()
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/documents/${id}`)
  if (!res.ok) throw new Error('Failed to delete document')
}

export async function fetchExpiringDocuments(days: number = 30): Promise<Document[]> {
  const res = await authFetch(`${BASE}/documents/expiring?days=${days}`)
  if (!res.ok) throw new Error('Failed to fetch expiring documents')
  return res.json()
}
