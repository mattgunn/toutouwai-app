export interface Delegation {
  id: string
  delegator_id: string
  delegate_id: string
  entity_type: string | null
  start_date: string
  end_date: string | null
  reason: string | null
  is_active: number
  delegator_name: string
  delegate_name: string
  created_at: string
  updated_at: string
}
