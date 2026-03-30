export interface Announcement {
  id: string
  title: string
  content: string | null
  category: string | null
  priority: string | null
  author_id: string | null
  publish_date: string | null
  expiry_date: string | null
  is_active: number
  author_name: string | null
  created_at: string
  updated_at: string
}
