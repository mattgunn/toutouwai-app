import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { EmergencyContact } from './types'

export async function fetchEmergencyContacts(employeeId?: string): Promise<EmergencyContact[]> {
  const qs = employeeId ? `?employee_id=${employeeId}` : ''
  const res = await authFetch(`${BASE}/emergency-contacts${qs}`)
  if (!res.ok) throw new Error('Failed to fetch emergency contacts')
  return res.json()
}

export async function createEmergencyContact(body: unknown): Promise<EmergencyContact> {
  const res = await jsonPost(`${BASE}/emergency-contacts`, body)
  if (!res.ok) throw new Error('Failed to create emergency contact')
  return res.json()
}

export async function updateEmergencyContact(id: string, body: unknown): Promise<EmergencyContact> {
  const res = await jsonPut(`${BASE}/emergency-contacts/${id}`, body)
  if (!res.ok) throw new Error('Failed to update emergency contact')
  return res.json()
}

export async function deleteEmergencyContact(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/emergency-contacts/${id}`)
  if (!res.ok) throw new Error('Failed to delete emergency contact')
}
