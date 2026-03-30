import { BASE, authFetch, jsonPost, jsonPut, jsonDelete } from '../shared/api'
import type { CustomFieldDefinition, CustomFieldValue } from './types'

// --- Field Definitions ---

export async function fetchFieldDefinitions(entityType?: string): Promise<CustomFieldDefinition[]> {
  const qs = entityType ? `?entity_type=${entityType}` : ''
  const res = await authFetch(`${BASE}/custom-fields/definitions${qs}`)
  if (!res.ok) throw new Error('Failed to fetch field definitions')
  return res.json()
}

export async function createFieldDefinition(body: unknown): Promise<CustomFieldDefinition> {
  const res = await jsonPost(`${BASE}/custom-fields/definitions`, body)
  if (!res.ok) throw new Error('Failed to create field definition')
  return res.json()
}

export async function updateFieldDefinition(id: string, body: unknown): Promise<CustomFieldDefinition> {
  const res = await jsonPut(`${BASE}/custom-fields/definitions/${id}`, body)
  if (!res.ok) throw new Error('Failed to update field definition')
  return res.json()
}

export async function deleteFieldDefinition(id: string): Promise<void> {
  const res = await jsonDelete(`${BASE}/custom-fields/definitions/${id}`)
  if (!res.ok) throw new Error('Failed to delete field definition')
}

// --- Field Values ---

export async function fetchFieldValues(params?: { entity_id?: string; definition_id?: string }): Promise<CustomFieldValue[]> {
  const query = new URLSearchParams()
  if (params?.entity_id) query.set('entity_id', params.entity_id)
  if (params?.definition_id) query.set('definition_id', params.definition_id)
  const qs = query.toString()
  const res = await authFetch(`${BASE}/custom-fields/values${qs ? '?' + qs : ''}`)
  if (!res.ok) throw new Error('Failed to fetch field values')
  return res.json()
}

export async function createFieldValue(body: unknown): Promise<CustomFieldValue> {
  const res = await jsonPost(`${BASE}/custom-fields/values`, body)
  if (!res.ok) throw new Error('Failed to create field value')
  return res.json()
}

export async function updateFieldValue(id: string, body: unknown): Promise<CustomFieldValue> {
  const res = await jsonPut(`${BASE}/custom-fields/values/${id}`, body)
  if (!res.ok) throw new Error('Failed to update field value')
  return res.json()
}
