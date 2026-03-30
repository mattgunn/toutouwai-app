export interface CustomFieldDefinition {
  id: string
  entity_type: string
  field_name: string
  field_type: string
  field_options: string | null
  is_required: number
  sort_order: number
  is_active: number
  created_at: string
  updated_at: string
}

export interface CustomFieldValue {
  id: string
  definition_id: string
  entity_id: string
  value: string | null
  // Joined from custom_field_definitions
  field_name: string | null
  field_type: string | null
  entity_type: string | null
  created_at: string
  updated_at: string
}
