export interface AuditEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  user_id: string | null
  user_name: string | null
  user_email: string | null
  created_at: string
}

export interface AuditResponse {
  entries: AuditEntry[]
  total: number
  page: number
  per_page: number
}
