export interface Notification {
  id: string
  user_id: string
  title: string
  message: string | null
  type: string | null
  entity_type: string | null
  entity_id: string | null
  is_read: number
  read_at: string | null
  created_at: string
}
