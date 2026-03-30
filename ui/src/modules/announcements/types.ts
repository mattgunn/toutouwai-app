export interface Announcement {
  id: string
  title: string
  content: string | null
  category: string | null
  priority: string | null
  status: string | null
  author_id: string | null
  expires_at: string | null
  is_active: number
  author_name: string | null
  created_at: string
  updated_at: string
}
