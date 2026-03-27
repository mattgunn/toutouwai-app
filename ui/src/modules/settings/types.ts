export interface User {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  permissions: string[]
  created_at: string
  updated_at: string
}
